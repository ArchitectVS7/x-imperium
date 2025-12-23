<?php
/**
 * PasswordHandler Unit Tests
 *
 * Tests password hashing, verification, and security features
 */

declare(strict_types=1);

namespace Tests\Unit\Security;

use PHPUnit\Framework\TestCase;
use PasswordHandler;

class PasswordHandlerTest extends TestCase
{
    /**
     * Test that hash() returns a valid Argon2ID hash
     */
    public function testHashReturnsArgon2idHash(): void
    {
        $password = 'TestPassword123!';
        $hash = PasswordHandler::hash($password);

        $this->assertStringStartsWith('$argon2id$', $hash);
        $this->assertNotEquals($password, $hash);
    }

    /**
     * Test that the same password produces different hashes (salt)
     */
    public function testHashProducesDifferentHashesForSamePassword(): void
    {
        $password = 'TestPassword123!';
        $hash1 = PasswordHandler::hash($password);
        $hash2 = PasswordHandler::hash($password);

        $this->assertNotEquals($hash1, $hash2);
    }

    /**
     * Test password verification with Argon2ID hash
     */
    public function testVerifyWithArgon2idHash(): void
    {
        $password = 'TestPassword123!';
        $hash = PasswordHandler::hash($password);

        $this->assertTrue(PasswordHandler::verify($password, $hash));
        $this->assertFalse(PasswordHandler::verify('WrongPassword', $hash));
    }

    /**
     * Test password verification with legacy MD5 hash
     */
    public function testVerifyWithLegacyMd5Hash(): void
    {
        $password = 'TestPassword123!';
        $md5Hash = md5($password);

        $this->assertTrue(PasswordHandler::verify($password, $md5Hash));
        $this->assertFalse(PasswordHandler::verify('WrongPassword', $md5Hash));
    }

    /**
     * Test that needsRehash returns true for MD5 hashes
     */
    public function testNeedsRehashReturnsTrueForMd5(): void
    {
        $md5Hash = md5('password');

        $this->assertTrue(PasswordHandler::needsRehash($md5Hash));
    }

    /**
     * Test that needsRehash returns false for Argon2ID hashes
     */
    public function testNeedsRehashReturnsFalseForArgon2id(): void
    {
        $hash = PasswordHandler::hash('password');

        $this->assertFalse(PasswordHandler::needsRehash($hash));
    }

    /**
     * Test isLegacyMd5Hash detection
     */
    public function testIsLegacyMd5Hash(): void
    {
        $md5Hash = md5('password');
        $argon2Hash = PasswordHandler::hash('password');

        $this->assertTrue(PasswordHandler::isLegacyMd5Hash($md5Hash));
        $this->assertFalse(PasswordHandler::isLegacyMd5Hash($argon2Hash));
        $this->assertFalse(PasswordHandler::isLegacyMd5Hash('not-a-hash'));
    }

    /**
     * Test password generation
     */
    public function testGeneratePassword(): void
    {
        $password = PasswordHandler::generatePassword(16);

        $this->assertEquals(16, strlen($password));
    }

    /**
     * Test password generation with custom length
     */
    public function testGeneratePasswordCustomLength(): void
    {
        $password = PasswordHandler::generatePassword(32);

        $this->assertEquals(32, strlen($password));
    }

    /**
     * Test password generation without special characters
     */
    public function testGeneratePasswordWithoutSpecialChars(): void
    {
        $password = PasswordHandler::generatePassword(16, false);

        $this->assertEquals(16, strlen($password));
        $this->assertMatchesRegularExpression('/^[a-zA-Z0-9]+$/', $password);
    }

    /**
     * Test reset token generation
     */
    public function testGenerateResetToken(): void
    {
        $token = PasswordHandler::generateResetToken();

        $this->assertEquals(64, strlen($token));
        $this->assertMatchesRegularExpression('/^[a-f0-9]+$/', $token);
    }

    /**
     * Test reset token hashing and verification
     */
    public function testResetTokenHashingAndVerification(): void
    {
        $token = PasswordHandler::generateResetToken();
        $hashedToken = PasswordHandler::hashResetToken($token);

        $this->assertTrue(PasswordHandler::verifyResetToken($token, $hashedToken));
        $this->assertFalse(PasswordHandler::verifyResetToken('wrongtoken', $hashedToken));
    }

    /**
     * Test password strength checker
     */
    public function testCheckStrengthWeak(): void
    {
        $result = PasswordHandler::checkStrength('abc');

        $this->assertArrayHasKey('score', $result);
        $this->assertArrayHasKey('feedback', $result);
        // Score is on a 0-4 scale
        $this->assertLessThan(2, $result['score']);
    }

    /**
     * Test password strength checker with strong password
     */
    public function testCheckStrengthStrong(): void
    {
        $result = PasswordHandler::checkStrength('MyStr0ng!P@ssw0rd#2024');

        $this->assertArrayHasKey('score', $result);
        // Score is on a 0-4 scale, strong password should be >= 3
        $this->assertGreaterThanOrEqual(3, $result['score']);
    }

    /**
     * Test password validation
     */
    public function testValidateShortPassword(): void
    {
        $result = PasswordHandler::validate('short');

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
    }

    /**
     * Test password validation with valid password
     */
    public function testValidateValidPassword(): void
    {
        $result = PasswordHandler::validate('ValidPassword123!');

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }

    /**
     * Test empty password handling
     */
    public function testEmptyPasswordHandling(): void
    {
        $hash = PasswordHandler::hash('');
        $this->assertStringStartsWith('$argon2id$', $hash);

        // Empty password should still verify against its own hash
        $this->assertTrue(PasswordHandler::verify('', $hash));
    }
}
