<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['profile_image_url'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'profile_image',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'password_reset_token',
        'password_reset_token_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'locked_until' => 'datetime',
        'last_login_at' => 'datetime',
        'password_reset_token_expires_at' => 'datetime',
    ];

    /**
     * Get all posts created by the user.
     */
    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    /**
     * Get all comments created by the user.
     */
    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    /**
     * Get all likes created by the user.
     */
    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    /**
     * Get all friend requests sent by the user.
     */
    public function sentFriendRequests()
    {
        return $this->hasMany(FriendRequest::class, 'sender_id');
    }

    /**
     * Get all friend requests received by the user.
     */
    public function receivedFriendRequests()
    {
        return $this->hasMany(FriendRequest::class, 'receiver_id');
    }

    /**
     * Get all friends (users this user is friends with).
     */
    public function friends()
    {
        return $this->belongsToMany(User::class, 'friends', 'user_id', 'friend_id')
            ->withTimestamps();
    }

    /**
     * Get all users who are friends with this user (reverse relationship).
     */
    public function friendOf()
    {
        return $this->belongsToMany(User::class, 'friends', 'friend_id', 'user_id')
            ->withTimestamps();
    }

    /**
     * Get all friends (both directions).
     */
    public function allFriends()
    {
        return User::whereIn('id', function($query) {
            $query->select('friend_id')
                ->from('friends')
                ->where('user_id', $this->id);
        })->orWhereIn('id', function($query) {
            $query->select('user_id')
                ->from('friends')
                ->where('friend_id', $this->id);
        });
    }

    /**
     * Check if this user is friends with another user.
     */
    public function isFriendWith($userId)
    {
        return \DB::table('friends')
            ->where(function($query) use ($userId) {
                $query->where('user_id', $this->id)
                    ->where('friend_id', $userId);
            })
            ->orWhere(function($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->where('friend_id', $this->id);
            })
            ->exists();
    }

    /**
     * Get the full URL for the user's profile image.
     */
    public function getProfileImageUrlAttribute(): ?string
    {
        if (!$this->profile_image) {
            return null;
        }
        
        return Storage::url($this->profile_image);
    }
}
