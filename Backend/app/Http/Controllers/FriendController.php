<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\FriendRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FriendController extends Controller
{
    /**
     * Search users by name.
     */
    public function search(Request $request)
    {
        $user = $request->user();
        $query = $request->input('q', '');
        
        if (empty($query)) {
            return response()->json([]);
        }

        // Get user IDs to exclude (current user, friends, pending requests)
        $excludedIds = $this->getExcludedUserIds($user);
        
        $users = User::whereNotIn('id', $excludedIds)
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%");
            })
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_image_url' => $user->profile_image_url,
                ];
            });

        return response()->json($users);
    }

    /**
     * Get suggested people (users not friends and no pending requests).
     */
    public function suggested(Request $request)
    {
        $user = $request->user();
        
        $excludedIds = $this->getExcludedUserIds($user);
        
        $suggested = User::whereNotIn('id', $excludedIds)
            ->where('id', '!=', $user->id)
            ->inRandomOrder()
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_image_url' => $user->profile_image_url,
                ];
            });

        return response()->json($suggested);
    }

    /**
     * Send a friend request.
     */
    public function sendRequest(Request $request)
    {
        $user = $request->user();
        $receiverId = $request->input('receiver_id');

        if ($user->id == $receiverId) {
            return response()->json(['message' => 'Cannot send request to yourself'], 400);
        }

        $receiver = User::findOrFail($receiverId);

        // Check if already friends
        if ($user->isFriendWith($receiverId)) {
            return response()->json(['message' => 'Already friends'], 400);
        }

        // Check if request already exists
        $existingRequest = FriendRequest::where(function($query) use ($user, $receiverId) {
            $query->where('sender_id', $user->id)
                  ->where('receiver_id', $receiverId);
        })->orWhere(function($query) use ($user, $receiverId) {
            $query->where('sender_id', $receiverId)
                  ->where('receiver_id', $user->id);
        })->first();

        if ($existingRequest) {
            if ($existingRequest->status === 'pending') {
                return response()->json(['message' => 'Request already pending'], 400);
            }
        }

        // Create new request
        $friendRequest = FriendRequest::create([
            'sender_id' => $user->id,
            'receiver_id' => $receiverId,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Friend request sent',
            'request' => $friendRequest,
        ]);
    }

    /**
     * Accept a friend request.
     */
    public function acceptRequest(Request $request, $id)
    {
        $user = $request->user();
        
        $friendRequest = FriendRequest::findOrFail($id);

        if ($friendRequest->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($friendRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already processed'], 400);
        }

        DB::transaction(function() use ($friendRequest, $user) {
            // Update request status
            $friendRequest->update(['status' => 'accepted']);

            // Create friendship (both directions)
            DB::table('friends')->insert([
                'user_id' => $friendRequest->sender_id,
                'friend_id' => $friendRequest->receiver_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return response()->json(['message' => 'Friend request accepted']);
    }

    /**
     * Reject a friend request.
     */
    public function rejectRequest(Request $request, $id)
    {
        $user = $request->user();
        
        $friendRequest = FriendRequest::findOrFail($id);

        if ($friendRequest->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $friendRequest->update(['status' => 'rejected']);

        return response()->json(['message' => 'Friend request rejected']);
    }

    /**
     * Get all friends.
     */
    public function friends(Request $request)
    {
        $user = $request->user();
        $search = $request->input('search', '');

        $friendsQuery = User::whereIn('id', function($query) use ($user) {
            $query->select('friend_id')
                ->from('friends')
                ->where('user_id', $user->id);
        })->orWhereIn('id', function($query) use ($user) {
            $query->select('user_id')
                ->from('friends')
                ->where('friend_id', $user->id);
        });

        if (!empty($search)) {
            $friendsQuery->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $friends = $friendsQuery->get()->map(function($friend) {
            return [
                'id' => $friend->id,
                'name' => $friend->name,
                'email' => $friend->email,
                'profile_image_url' => $friend->profile_image_url,
            ];
        });

        return response()->json($friends);
    }

    /**
     * Get pending friend requests (received).
     */
    public function pendingRequests(Request $request)
    {
        $user = $request->user();

        $requests = FriendRequest::where('receiver_id', $user->id)
            ->where('status', 'pending')
            ->with('sender')
            ->get()
            ->map(function($request) {
                return [
                    'id' => $request->id,
                    'sender' => [
                        'id' => $request->sender->id,
                        'name' => $request->sender->name,
                        'email' => $request->sender->email,
                        'profile_image_url' => $request->sender->profile_image_url,
                    ],
                    'created_at' => $request->created_at,
                ];
            });

        return response()->json($requests);
    }

    /**
     * Get excluded user IDs (current user, friends, pending requests).
     */
    private function getExcludedUserIds($user)
    {
        $excludedIds = [$user->id];

        // Add friends
        $friendIds = DB::table('friends')
            ->where('user_id', $user->id)
            ->pluck('friend_id')
            ->merge(
                DB::table('friends')
                    ->where('friend_id', $user->id)
                    ->pluck('user_id')
            );
        $excludedIds = array_merge($excludedIds, $friendIds->toArray());

        // Add pending requests (both sent and received)
        $pendingRequestIds = FriendRequest::where(function($query) use ($user) {
            $query->where('sender_id', $user->id)
                  ->orWhere('receiver_id', $user->id);
        })->where('status', 'pending')
        ->get()
        ->map(function($request) use ($user) {
            return $request->sender_id == $user->id 
                ? $request->receiver_id 
                : $request->sender_id;
        })
        ->toArray();
        
        $excludedIds = array_merge($excludedIds, $pendingRequestIds);

        return array_unique($excludedIds);
    }
}
