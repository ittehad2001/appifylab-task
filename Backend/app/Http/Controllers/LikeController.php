<?php

namespace App\Http\Controllers;

use App\Models\Like;
use App\Models\Post;
use App\Models\Comment;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    /**
     * Toggle like on a post or comment.
     */
    public function toggle(Request $request)
    {
        $request->validate([
            'likeable_type' => 'required|in:post,comment',
            'likeable_id' => 'required|integer',
            'reaction_type' => 'required|in:like,love,care,haha,wow,sad,angry,dislike',
        ]);

        $user = $request->user();
        $likeableType = $request->likeable_type === 'post' ? Post::class : Comment::class;
        $likeableId = $request->likeable_id;
        $reactionType = $request->reaction_type;

        // Verify the likeable exists
        $likeable = $likeableType::findOrFail($likeableId);

        // Check if reaction already exists for this user
        $existingLike = Like::where('user_id', $user->id)
            ->where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->first();

        if ($existingLike) {
            if ($existingLike->reaction_type === $reactionType) {
                // Same reaction: remove it (unlike)
                $existingLike->delete();
                $reacted = false;
                $current_reaction = null;
            } else {
                // Different reaction: update it
                $existingLike->reaction_type = $reactionType;
                $existingLike->save();
                $reacted = true;
                $current_reaction = $reactionType;
            }
        } else {
            // New reaction: create it
            Like::create([
                'user_id' => $user->id,
                'likeable_type' => $likeableType,
                'likeable_id' => $likeableId,
                'reaction_type' => $reactionType,
            ]);
            $reacted = true;
            $current_reaction = $reactionType;
        }

        // Get updated likes count using database aggregation (faster)
        $likesCount = Like::where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->count();

        // Get likes with users for preview (removed limit to show all reactions)
        $likes = Like::where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->with(['user:id,name,profile_image'])
            ->get();

        // Group reactions by type using database aggregation (much faster)
        $reactionsByType = Like::where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->selectRaw('reaction_type, COUNT(*) as count')
            ->groupBy('reaction_type')
            ->get()
            ->keyBy('reaction_type')
            ->map(function ($item) use ($likeableType, $likeableId) {
                // Get users for this reaction type (removed limit to show all reactions)
                $users = Like::where('likeable_type', $likeableType)
                    ->where('likeable_id', $likeableId)
                    ->where('reaction_type', $item->reaction_type)
                    ->with(['user:id,name,profile_image'])
                    ->get()
                    ->map(function ($like) {
                        return [
                            'id' => $like->id,
                            'user' => [
                                'id' => $like->user->id,
                                'name' => $like->user->name,
                                'profile_image_url' => $like->user->profile_image_url ?? null,
                            ],
                        ];
                    })
                    ->values();
                
                return [
                    'count' => $item->count,
                    'users' => $users,
                ];
            });

        return response()->json([
            'reacted' => $reacted,
            'current_reaction' => $current_reaction,
            'likes_count' => $likesCount,
            'reactions' => $reactionsByType,
            'likes' => $likes->map(function ($like) {
                return [
                    'id' => $like->id,
                    'reaction_type' => $like->reaction_type,
                    'user' => [
                        'id' => $like->user->id,
                        'name' => $like->user->name,
                        'profile_image_url' => $like->user->profile_image_url ?? null,
                    ],
                ];
            }),
        ]);
    }

    /**
     * Get users who liked a post or comment.
     */
    public function getLikes(Request $request)
    {
        $request->validate([
            'likeable_type' => 'required|in:post,comment',
            'likeable_id' => 'required|integer',
        ]);

        $likeableType = $request->likeable_type === 'post' ? Post::class : Comment::class;
        $likeableId = $request->likeable_id;

        // Use database aggregation for count (faster)
        $likesCount = Like::where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->count();

        // Get likes with optimized eager loading (removed limit for scalability)
        $likes = Like::where('likeable_type', $likeableType)
            ->where('likeable_id', $likeableId)
            ->with(['user:id,name,email,profile_image'])
            ->latest()
            ->get();

        return response()->json([
            'likes_count' => $likesCount,
            'likes' => $likes->map(function ($like) {
                return [
                    'id' => $like->id,
                    'user' => [
                        'id' => $like->user->id,
                        'name' => $like->user->name,
                        'email' => $like->user->email,
                        'profile_image_url' => $like->user->profile_image_url ?? null,
                    ],
                    'created_at' => $like->created_at,
                ];
            }),
        ]);
    }
}
