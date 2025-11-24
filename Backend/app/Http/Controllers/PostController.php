<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Like;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     * Get all public posts and user's own private posts, ordered by newest first.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 20); // No limit - scalable for millions of posts
        
        // Optimized query with proper eager loading and limits
        $posts = Post::with([
            'user:id,name,email,profile_image',
            'likes' => function ($query) use ($user) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->where('likeable_type', Post::class)
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            },
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all comments
            },
            'comments.replies' => function ($query) {
                $query->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all replies
            },
            'comments.likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
            }
        ])
            ->where(function ($query) use ($user) {
                // Show public posts or user's own posts (private or public)
                $query->where('privacy', 'public')
                    ->orWhere('user_id', $user->id);
            })
            ->latest('created_at')
            ->paginate($perPage);

        // Get all post IDs for batch queries
        $postIds = $posts->pluck('id');
        
        // Batch load user likes for all posts (single query instead of N queries)
        $userLikes = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Post::class)
            ->whereIn('likeable_id', $postIds)
            ->get()
            ->keyBy('likeable_id');
        
        // Batch load likes counts using database aggregation (much faster)
        $likesCounts = \App\Models\Like::where('likeable_type', Post::class)
            ->whereIn('likeable_id', $postIds)
            ->selectRaw('likeable_id, COUNT(*) as count')
            ->groupBy('likeable_id')
            ->pluck('count', 'likeable_id');
        
        // Batch load comment IDs for batch queries
        $commentIds = $posts->pluck('comments')->flatten()->pluck('id');
        $replyIds = $posts->pluck('comments')->flatten()->pluck('replies')->flatten()->pluck('id');
        $allCommentIds = $commentIds->merge($replyIds);
        
        // Batch load user likes for comments/replies
        $userCommentLikes = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', \App\Models\Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->get()
            ->keyBy('likeable_id');
        
        // Batch load comment likes counts
        $commentLikesCounts = \App\Models\Like::where('likeable_type', \App\Models\Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->selectRaw('likeable_id, COUNT(*) as count')
            ->groupBy('likeable_id')
            ->pluck('count', 'likeable_id');
        
        // Batch load reactions grouped by type using database aggregation
        $reactionsByType = \App\Models\Like::where('likeable_type', \App\Models\Comment::class)
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

        // Transform posts with optimized data
        $posts->getCollection()->transform(function ($post) use ($user, $userLikes, $likesCounts, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
            $userLike = $userLikes->get($post->id);
            $post->is_liked = $userLike ? true : false;
            $post->current_reaction = $userLike ? $userLike->reaction_type : null;
            $post->likes_count = $likesCounts->get($post->id, 0);
            
            // Transform comments with optimized data
            $post->comments->transform(function ($comment) use ($user, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
                $userLike = $userCommentLikes->get($comment->id);
                $comment->is_liked = $userLike ? true : false;
                $comment->current_reaction = $userLike ? $userLike->reaction_type : null;
                $comment->likes_count = $commentLikesCounts->get($comment->id, 0);
                
                // Use pre-calculated reactions
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
            
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Check if user can create posts using policy
        $this->authorize('create', Post::class);

        $request->validate([
            'content' => ['nullable', 'string', 'max:5000', 'required_without:image'], // At least content or image required
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'], // Increased to 5MB, added webp
            'privacy' => ['required', 'in:public,private'],
        ]);
        
        // Sanitize content to prevent XSS
        if ($request->content) {
            $request->merge(['content' => strip_tags($request->content)]);
        }

        $user = $request->user();
        $data = [
            'user_id' => $user->id,
            'content' => $request->content,
            'privacy' => $request->privacy,
        ];

        // Handle image upload
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('posts', 'public');
            $data['image'] = $imagePath;
        }

        $post = Post::create($data);
        
        // Optimized loading with select clauses
        $post->load([
            'user:id,name,email,profile_image',
            'likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->where('likeable_type', Post::class)
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            },
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all comments
            }
        ]);
        
        // Use batch query for like status
        $userLike = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->first();
        
        $post->is_liked = $userLike ? true : false;
        $post->current_reaction = $userLike ? $userLike->reaction_type : null;
        
        // Use database aggregation for count
        $post->likes_count = \App\Models\Like::where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->count();

        return response()->json([
            'message' => 'Post created successfully',
            'post' => $post,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        
        // Optimized query with proper eager loading and select clauses
        $post = Post::with([
            'user:id,name,email,profile_image',
            'likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->where('likeable_type', Post::class)
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            },
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all comments
            },
            'comments.replies' => function ($query) {
                $query->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all replies
            },
            'comments.likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
            }
        ])
            ->findOrFail($id);

        // Check if user can view this post using policy
        $this->authorize('view', $post);

        // Batch load user like for post
        $userLike = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->first();
        
        $post->is_liked = $userLike ? true : false;
        $post->current_reaction = $userLike ? $userLike->reaction_type : null;
        
        // Use database aggregation for count
        $post->likes_count = \App\Models\Like::where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->count();

        // Get all comment and reply IDs for batch queries
        $commentIds = $post->comments->pluck('id');
        $replyIds = $post->comments->pluck('replies')->flatten()->pluck('id');
        $allCommentIds = $commentIds->merge($replyIds);

        // Batch load user likes for comments/replies
        $userCommentLikes = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->get()
            ->keyBy('likeable_id');

        // Batch load comment likes counts
        $commentLikesCounts = \App\Models\Like::where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->selectRaw('likeable_id, COUNT(*) as count')
            ->groupBy('likeable_id')
            ->pluck('count', 'likeable_id');

        // Batch load reactions grouped by type
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
        $post->comments->transform(function ($comment) use ($user, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
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

        return response()->json($post);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $post = Post::findOrFail($id);
        $user = $request->user();

        // Check if user can update this post using policy
        $this->authorize('update', $post);

        $request->validate([
            'content' => 'nullable|string|max:5000',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'privacy' => 'nullable|in:public,private',
            'remove_image' => 'nullable|boolean',
        ]);

        if ($request->has('content')) {
            $post->content = $request->content;
        }

        if ($request->has('privacy')) {
            $post->privacy = $request->privacy;
        }

        // Handle image removal (if remove_image flag is set)
        if ($request->has('remove_image') && $request->remove_image === 'true') {
            if ($post->image) {
                Storage::disk('public')->delete($post->image);
            }
            $post->image = null;
        }
        // Handle image upload
        elseif ($request->hasFile('image')) {
            // Delete old image if exists
            if ($post->image) {
                Storage::disk('public')->delete($post->image);
            }
            $imagePath = $request->file('image')->store('posts', 'public');
            $post->image = $imagePath;
        }

        $post->save();
        
        // Reload with optimized relationships
        $post->load([
            'user:id,name,email,profile_image',
            'likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->where('likeable_type', Post::class)
                    ->with(['user:id,name,profile_image']);
                    // Removed limit to show all reactions
            },
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all comments
            },
            'comments.replies' => function ($query) {
                $query->with(['user:id,name,email,profile_image'])
                    ->latest();
                    // Removed limit to show all replies
            },
            'comments.likes' => function ($query) {
                $query->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction_type')
                    ->with(['user:id,name,profile_image']);
            }
        ]);
        
        // Format the post response similar to index method
        $user = $request->user();
        
        // Use batch query for like status
        $userLike = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->first();
        
        $post->is_liked = $userLike ? true : false;
        $post->current_reaction = $userLike ? $userLike->reaction_type : null;
        
        // Use database aggregation for count
        $post->likes_count = \App\Models\Like::where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->count();
        
        // Get all comment and reply IDs for batch queries
        $commentIds = $post->comments->pluck('id');
        $replyIds = $post->comments->pluck('replies')->flatten()->pluck('id');
        $allCommentIds = $commentIds->merge($replyIds);

        // Batch load user likes for comments/replies
        $userCommentLikes = \App\Models\Like::where('user_id', $user->id)
            ->where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->get()
            ->keyBy('likeable_id');

        // Batch load comment likes counts
        $commentLikesCounts = \App\Models\Like::where('likeable_type', Comment::class)
            ->whereIn('likeable_id', $allCommentIds)
            ->selectRaw('likeable_id, COUNT(*) as count')
            ->groupBy('likeable_id')
            ->pluck('count', 'likeable_id');

        // Batch load reactions grouped by type
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
        
        // Add like status for comments using batch queries
        $post->comments->transform(function ($comment) use ($user, $userCommentLikes, $commentLikesCounts, $reactionsByType) {
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
        
        // Group reactions by type for post using database aggregation
        $postReactions = \App\Models\Like::where('likeable_type', Post::class)
            ->where('likeable_id', $post->id)
            ->selectRaw('reaction_type, COUNT(*) as count')
            ->groupBy('reaction_type')
            ->get()
            ->keyBy('reaction_type')
            ->map(function ($item) {
                return ['count' => $item->count];
            });
        
        $post->reactions = $postReactions;

        return response()->json([
            'message' => 'Post updated successfully',
            'post' => $post,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $post = Post::findOrFail($id);
        $user = $request->user();

        // Check if user can delete this post using policy
        $this->authorize('delete', $post);

        // Delete image if exists
        if ($post->image) {
            Storage::disk('public')->delete($post->image);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted successfully']);
    }
}
