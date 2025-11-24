<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add composite indexes for common query patterns to improve performance at scale.
     */
    public function up(): void
    {
        // Posts table - composite index for privacy + created_at (most common query)
        Schema::table('posts', function (Blueprint $table) {
            $table->index(['privacy', 'created_at'], 'posts_privacy_created_at_index');
            $table->index(['user_id', 'created_at'], 'posts_user_created_at_index');
        });

        // Comments table - composite indexes for post queries
        Schema::table('comments', function (Blueprint $table) {
            $table->index(['post_id', 'parent_id', 'created_at'], 'comments_post_parent_created_index');
        });

        // Likes table - optimize polymorphic queries
        Schema::table('likes', function (Blueprint $table) {
            $table->index(['likeable_type', 'likeable_id', 'created_at'], 'likes_type_id_created_index');
            $table->index(['user_id', 'likeable_type', 'reaction_type'], 'likes_user_type_reaction_index');
        });

        // Friend requests - optimize status queries
        Schema::table('friend_requests', function (Blueprint $table) {
            $table->index(['receiver_id', 'status', 'created_at'], 'friend_requests_receiver_status_index');
            $table->index(['sender_id', 'status'], 'friend_requests_sender_status_index');
        });

        // Friends table - optimize friend lookups
        Schema::table('friends', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'friends_user_created_index');
            $table->index(['friend_id', 'created_at'], 'friends_friend_created_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('posts_privacy_created_at_index');
            $table->dropIndex('posts_user_created_at_index');
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->dropIndex('comments_post_parent_created_index');
        });

        Schema::table('likes', function (Blueprint $table) {
            $table->dropIndex('likes_type_id_created_index');
            $table->dropIndex('likes_user_type_reaction_index');
        });

        Schema::table('friend_requests', function (Blueprint $table) {
            $table->dropIndex('friend_requests_receiver_status_index');
            $table->dropIndex('friend_requests_sender_status_index');
        });

        Schema::table('friends', function (Blueprint $table) {
            $table->dropIndex('friends_user_created_index');
            $table->dropIndex('friends_friend_created_index');
        });
    }
};







