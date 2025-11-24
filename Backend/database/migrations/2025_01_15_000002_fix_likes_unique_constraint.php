<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fix unique constraint - user can only have ONE reaction per item (not one per reaction type).
     * Users can change reaction types, but cannot have multiple reactions simultaneously.
     */
    public function up(): void
    {
        Schema::table('likes', function (Blueprint $table) {
            // Drop the incorrect unique constraint that includes reaction_type
            $table->dropUnique(['user_id', 'likeable_id', 'likeable_type', 'reaction_type']);
            
            // Add correct unique constraint - one reaction per user per item
            $table->unique(['user_id', 'likeable_id', 'likeable_type'], 'likes_user_likeable_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('likes', function (Blueprint $table) {
            $table->dropUnique('likes_user_likeable_unique');
            $table->unique(['user_id', 'likeable_id', 'likeable_type', 'reaction_type']);
        });
    }
};


