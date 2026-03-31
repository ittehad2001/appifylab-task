<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrivacyAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_another_users_public_post_detail(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $publicPost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Public post',
            'privacy' => 'public',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/posts/{$publicPost->id}");

        $response->assertOk();
    }

    public function test_user_cannot_view_another_users_private_post_detail(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/posts/{$privatePost->id}");

        $response->assertForbidden();
    }

    public function test_owner_can_view_own_private_post_detail(): void
    {
        $owner = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/posts/{$privatePost->id}");

        $response->assertOk();
    }

    public function test_user_cannot_view_comments_for_another_users_private_post(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        Comment::create([
            'user_id' => $owner->id,
            'post_id' => $privatePost->id,
            'content' => 'Private comment',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/posts/{$privatePost->id}/comments");

        $response->assertForbidden();
    }

    public function test_user_cannot_get_likes_for_another_users_private_post(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->getJson("/api/likes?likeable_type=post&likeable_id={$privatePost->id}");

        $response->assertForbidden();
    }

    public function test_user_cannot_toggle_like_on_comment_of_another_users_private_post(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        $comment = Comment::create([
            'user_id' => $owner->id,
            'post_id' => $privatePost->id,
            'content' => 'Private comment',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->postJson('/api/likes/toggle', [
            'likeable_type' => 'comment',
            'likeable_id' => $comment->id,
            'reaction_type' => 'like',
        ]);

        $response->assertForbidden();
    }

    public function test_user_can_toggle_like_on_another_users_public_post(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $publicPost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Public post',
            'privacy' => 'public',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->postJson('/api/likes/toggle', [
            'likeable_type' => 'post',
            'likeable_id' => $publicPost->id,
            'reaction_type' => 'like',
        ]);

        $response->assertOk()->assertJson([
            'reacted' => true,
            'current_reaction' => 'like',
        ]);
    }

    public function test_user_cannot_toggle_like_on_another_users_private_post(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();

        $privatePost = Post::create([
            'user_id' => $owner->id,
            'content' => 'Private post',
            'privacy' => 'private',
        ]);

        Sanctum::actingAs($viewer);

        $response = $this->postJson('/api/likes/toggle', [
            'likeable_type' => 'post',
            'likeable_id' => $privatePost->id,
            'reaction_type' => 'like',
        ]);

        $response->assertForbidden();
    }
}
