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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'failed_login_attempts')) {
                $table->integer('failed_login_attempts')->default(0)->after('password');
            }
            if (!Schema::hasColumn('users', 'locked_until')) {
                $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('locked_until');
            }
            if (!Schema::hasColumn('users', 'password_reset_token')) {
                $table->string('password_reset_token')->nullable()->after('last_login_at');
            }
            if (!Schema::hasColumn('users', 'password_reset_token_expires_at')) {
                $table->timestamp('password_reset_token_expires_at')->nullable()->after('password_reset_token');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = [];
            
            if (Schema::hasColumn('users', 'failed_login_attempts')) {
                $columnsToDrop[] = 'failed_login_attempts';
            }
            if (Schema::hasColumn('users', 'locked_until')) {
                $columnsToDrop[] = 'locked_until';
            }
            if (Schema::hasColumn('users', 'last_login_at')) {
                $columnsToDrop[] = 'last_login_at';
            }
            if (Schema::hasColumn('users', 'password_reset_token')) {
                $columnsToDrop[] = 'password_reset_token';
            }
            if (Schema::hasColumn('users', 'password_reset_token_expires_at')) {
                $columnsToDrop[] = 'password_reset_token_expires_at';
            }
            
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
