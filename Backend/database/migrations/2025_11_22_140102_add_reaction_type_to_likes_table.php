<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('likes', function (Blueprint $table) {
            $table->string('reaction_type')->default('like')->after('likeable_type');
            // Update unique constraint to include reaction_type
            $table->dropUnique(['user_id', 'likeable_id', 'likeable_type']);
            $table->unique(['user_id', 'likeable_id', 'likeable_type', 'reaction_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('likes', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'likeable_id', 'likeable_type', 'reaction_type']);
            $table->unique(['user_id', 'likeable_id', 'likeable_type']);
            $table->dropColumn('reaction_type');
        });
    }
};
