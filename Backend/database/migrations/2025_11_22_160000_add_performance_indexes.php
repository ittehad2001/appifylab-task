<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Check if an index exists on a table
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $connection = DB::connection();
        $databaseName = $connection->getDatabaseName();
        
        $result = $connection->selectOne(
            "SELECT COUNT(*) as count FROM information_schema.statistics 
             WHERE table_schema = ? AND table_name = ? AND index_name = ?",
            [$databaseName, $table, $indexName]
        );
        
        return $result->count > 0;
    }

    /**
     * Safely drop an index, catching errors if index is used by foreign key
     */
    private function safeDropIndex(string $table, string $indexName): void
    {
        if (!$this->hasIndex($table, $indexName)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        } catch (\Exception $e) {
            // Index might be used by foreign key constraint, skip dropping
            // This is safe - the index will remain but that's okay for performance
        }
    }

    /**
     * Run the migrations.
     * Add composite indexes for common query patterns to improve performance at scale.
     */
    public function up(): void
    {
        // Posts table - composite index for privacy + created_at (most common query)
        if (!$this->hasIndex('posts', 'posts_privacy_created_at_index')) {
            Schema::table('posts', function (Blueprint $table) {
                $table->index(['privacy', 'created_at'], 'posts_privacy_created_at_index');
            });
        }
        if (!$this->hasIndex('posts', 'posts_user_created_at_index')) {
            Schema::table('posts', function (Blueprint $table) {
                $table->index(['user_id', 'created_at'], 'posts_user_created_at_index');
            });
        }

        // Comments table - composite indexes for post queries
        if (!$this->hasIndex('comments', 'comments_post_parent_created_index')) {
            Schema::table('comments', function (Blueprint $table) {
                $table->index(['post_id', 'parent_id', 'created_at'], 'comments_post_parent_created_index');
            });
        }

        // Likes table - optimize polymorphic queries
        if (!$this->hasIndex('likes', 'likes_type_id_created_index')) {
            Schema::table('likes', function (Blueprint $table) {
                $table->index(['likeable_type', 'likeable_id', 'created_at'], 'likes_type_id_created_index');
            });
        }
        if (!$this->hasIndex('likes', 'likes_user_type_reaction_index')) {
            Schema::table('likes', function (Blueprint $table) {
                $table->index(['user_id', 'likeable_type', 'reaction_type'], 'likes_user_type_reaction_index');
            });
        }

        // Friend requests - optimize status queries
        if (!$this->hasIndex('friend_requests', 'friend_requests_receiver_status_index')) {
            Schema::table('friend_requests', function (Blueprint $table) {
                $table->index(['receiver_id', 'status', 'created_at'], 'friend_requests_receiver_status_index');
            });
        }
        if (!$this->hasIndex('friend_requests', 'friend_requests_sender_status_index')) {
            Schema::table('friend_requests', function (Blueprint $table) {
                $table->index(['sender_id', 'status'], 'friend_requests_sender_status_index');
            });
        }

        // Friends table - optimize friend lookups
        if (!$this->hasIndex('friends', 'friends_user_created_index')) {
            Schema::table('friends', function (Blueprint $table) {
                $table->index(['user_id', 'created_at'], 'friends_user_created_index');
            });
        }
        if (!$this->hasIndex('friends', 'friends_friend_created_index')) {
            Schema::table('friends', function (Blueprint $table) {
                $table->index(['friend_id', 'created_at'], 'friends_friend_created_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop posts indexes
        $this->safeDropIndex('posts', 'posts_privacy_created_at_index');
        $this->safeDropIndex('posts', 'posts_user_created_at_index');

        // Drop comments indexes
        $this->safeDropIndex('comments', 'comments_post_parent_created_index');

        // Drop likes indexes
        $this->safeDropIndex('likes', 'likes_type_id_created_index');
        $this->safeDropIndex('likes', 'likes_user_type_reaction_index');

        // Drop friend_requests indexes
        // Note: These indexes may be used by foreign key constraints, so we use safeDropIndex
        $this->safeDropIndex('friend_requests', 'friend_requests_receiver_status_index');
        $this->safeDropIndex('friend_requests', 'friend_requests_sender_status_index');

        // Drop friends indexes
        $this->safeDropIndex('friends', 'friends_user_created_index');
        $this->safeDropIndex('friends', 'friends_friend_created_index');
    }
};







