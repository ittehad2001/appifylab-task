<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CommentController extends Controller
{
    /**
     * Get all comments for a post.
     */
    public function index(Request $request, $postId)
    {
        $user = $request->user();
        
        // Optimized query with proper eager loading and select clauses
        $comments = Comment::with([
            'user:id,name,email,profile_image',
            'replies' => function ($query) {
                $query->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all replies
            },
            'replies.likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            }
        ])
            ->where('post_id', $postId)
            ->whereNull('parent_id')
            ->latest()
            ->get();

        // Get all comment and reply IDs for batch queries
        $commentIds = $comments->pluck('id');
        $replyIds = $comments->pluck('replies')->flatten()->pluck('id');
        $allCommentIds = $commentIds->merge($replyIds);

        // Batch load user likes for comments/replies (single query instead of N queries)
        $userCommentLikes = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->get()
            ->keyBy('likeable_id');

        // Batch load comment likes counts using database aggregation (much faster)
        $commentLikesCounts = \App\Models\Like::where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->selectRaw('likeable_id, COUNT(*) as count')
            ->groupBy('likeable_id')
            ->pluck('count', 'likeable_id');

        // Batch load reactions grouped by type using database aggregation
        $reactionsByType = \App\Models\Like::where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->selectRaw('likeable_id, reaction_type, COUNT(*) as count')
            ->groupBy('likeable_id', 'reaction_type')
            ->get()
            ->groupBy('likeable_id')
            ->map(function ($group) {
                return $group->keyBy('reaction_type')->map(function ($item) {
                    return ['count' => $item->count];
                });
            });

        // Transform comments with optimized data
        $comments->transform(function ($comment) use ($user, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
            $userLike = $userCommentLikes->get($comment->id);
            $comment->is_liked = $userLike ? true : false;
            $comment->current_reaction = $userLike ? $userLike->reaction_type : null;
            $comment->likes_count = $commentLikesCounts->get($comment->id, 0);
            $comment->reactions = $reactionsByType->get($comment->id, collect());
            
            // Transform replies
            $comment->replies->transform(function ($reply) use ($user, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
                $userLike = $userCommentLikes->get($reply->id);
                $reply->is_liked = $userLike ? true : false;
                $reply->current_reaction = $userLike ? $userLike->reaction_type : null;
                $reply->likes_count = $commentLikesCounts->get($reply->id, 0);
                $reply->reactions = $reactionsByType->get($reply->id, collect());
                return $reply;
            });
            
            return $comment;
        });

        return response()->json($comments);
    }

    /**
     * Store a newly created comment or reply.
     */
    public function store(Request $request)
    {
        // Check if user can create comments using policy
        $this->authorize('create', Comment::class);

        $request->validate([
            'post_id' => 'required|exists:posts,id',
            'parent_id' => 'nullable|exists:comments,id',
            'content' => ['nullable', 'string', 'max:1000', 'required_without:image'], // At least content or image required
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // 5MB max, added webp
        ]);
        
        // Sanitize content to prevent XSS
        if ($request->content) {
            $request->merge(['content' => strip_tags($request->content)]);
        }

        $user = $request->user();
        
        // Verify post exists and user can view it using policy
        $post = Post::findOrFail($request->post_id);
        $this->authorize('view', $post);

        // If parent_id is provided, verify it exists and belongs to the same post
        if ($request->parent_id) {
            $parentComment = Comment::findOrFail($request->parent_id);
            if ($parentComment->post_id !== $post->id) {
                return response()->json(['message' => 'Invalid parent comment'], 400);
            }
        }

        $data = [
            'user_id' => $user->id,
            'post_id' => $request->post_id,
            'parent_id' => $request->parent_id,
            'content' => $request->content,
        ];

        // Handle image upload
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('comments', 'public');
            $data['image'] = $imagePath;
        }

        $comment = Comment::create($data);

        // Optimized loading with select clauses
        $comment->load([
            'user:id,name,email,profile_image',
            'likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            }
        ]);
        
        // Use batch query for like status instead of isLikedBy()
        $userLike = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Comment::class)
            ->where('likeable_id', $comment->id)
            ->first();
        
        $comment->is_liked = $userLike ? true : false;
        $comment->current_reaction = $userLike ? $userLike->reaction_type : null;
        
        // Use database aggregation for count
        $comment->likes_count = \App\Models\Like::where('likeable_type', Comment::class)
            ->where('likeable_id', $comment->id)
            ->count();

        return response()->json([
            'message' => 'Comment created successfully',
            'comment' => $comment,
        ], 201);
    }

    /**
     * Update the specified comment.
     */
    public function update(Request $request, string $id)
    {
        $comment = Comment::findOrFail($id);
        $user = $request->user();

        // Check if user owns the comment
        if ($comment->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $comment->content = $request->content;
        $comment->save();
        
        // Optimized loading with select clauses
        $comment->load([
            'user:id,name,email,profile_image',
            'likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            }
        ]);
        
        // Use batch query for like status
        $userLike = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Comment::class)
            ->where('likeable_id', $comment->id)
            ->first();
        
        $comment->is_liked = $userLike ? true : false;
        $comment->current_reaction = $userLike ? $userLike->reaction_type : null;
        $comment->likes_count = \App\Models\Like::where('likeable_type', Comment::class)
            ->where('likeable_id', $comment->id)
            ->count();

        return response()->json([
            'message' => 'Comment updated successfully',
            'comment' => $comment,
        ]);
    }

    /**
     * Remove the specified comment.
     */
    public function destroy(Request $request, string $id)
    {
        $comment = Comment::findOrFail($id);

        // Check if user can delete this comment using policy
        $this->authorize('delete', $comment);

        $comment->delete();

        return response()->json(['message' => 'Comment deleted successfully']);
    }
}
