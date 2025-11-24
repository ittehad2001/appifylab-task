<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Check if a unique constraint/index exists on a table
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
     * Run the migrations.
     * Fix unique constraint - user can only have ONE reaction per item (not one per reaction type).
     * Users can change reaction types, but cannot have multiple reactions simultaneously.
     */
    public function up(): void
    {
        // Try to drop the old unique constraint that includes reaction_type
        // If it doesn't exist, the migration will continue without error
        try {
            Schema::table('likes', function (Blueprint $table) {
                $table->dropUnique(['user_id', 'likeable_id', 'likeable_type', 'reaction_type']);
            });
        } catch (\Exception $e) {
            // Constraint doesn't exist, which is fine - continue
        }
        
        // Also try dropping by the specific constraint name from the error message
        $oldConstraintName = 'likes_user_id_likeable_id_likeable_type_reaction_type_unique';
        if ($this->hasIndex('likes', $oldConstraintName)) {
            try {
                Schema::table('likes', function (Blueprint $table) use ($oldConstraintName) {
                    $table->dropIndex($oldConstraintName);
                });
            } catch (\Exception $e) {
                // Constraint might not exist, continue
            }
        }
        
        // Add correct unique constraint - one reaction per user per item (if it doesn't exist)
        if (!$this->hasIndex('likes', 'likes_user_likeable_unique')) {
            Schema::table('likes', function (Blueprint $table) {
                $table->unique(['user_id', 'likeable_id', 'likeable_type'], 'likes_user_likeable_unique');
            });
        }
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







