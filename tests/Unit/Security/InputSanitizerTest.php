<?php
/**
 * InputSanitizer Unit Tests
 *
 * Tests input sanitization and XSS prevention
 */

declare(strict_types=1);

namespace Tests\Unit\Security;

use PHPUnit\Framework\TestCase;
use InputSanitizer;

class InputSanitizerTest extends TestCase
{
    /**
     * Test HTML escaping prevents XSS
     */
    public function testHtmlEscapesXss(): void
    {
        $malicious = '<script>alert("XSS")</script>';
        $sanitized = InputSanitizer::html($malicious);

        $this->assertStringNotContainsString('<script>', $sanitized);
        $this->assertStringContainsString('&lt;script&gt;', $sanitized);
    }

    /**
     * Test HTML escaping with quotes
     */
    public function testHtmlEscapesQuotes(): void
    {
        $input = 'Test "double" and \'single\' quotes';
        $sanitized = InputSanitizer::html($input);

        $this->assertStringContainsString('&quot;', $sanitized);
        // HTML5 uses &apos; instead of &#039;
        $this->assertStringContainsString('&apos;', $sanitized);
    }

    /**
     * Test escape method
     */
    public function testEscape(): void
    {
        $input = '<b>Bold</b> & "quoted"';
        $sanitized = InputSanitizer::escape($input);

        $this->assertStringNotContainsString('<b>', $sanitized);
        $this->assertStringContainsString('&amp;', $sanitized);
    }

    /**
     * Test stripTags removes HTML
     */
    public function testStripTagsRemovesHtml(): void
    {
        $input = '<p>Paragraph</p><script>evil()</script>';
        $sanitized = InputSanitizer::stripTags($input);

        $this->assertEquals('Paragraphevil()', $sanitized);
    }

    /**
     * Test stripTags with allowed tags
     */
    public function testStripTagsWithAllowedTags(): void
    {
        $input = '<p>Paragraph</p><script>evil()</script>';
        $sanitized = InputSanitizer::stripTags($input, '<p>');

        $this->assertStringContainsString('<p>', $sanitized);
        $this->assertStringNotContainsString('<script>', $sanitized);
    }

    /**
     * Test integer sanitization
     */
    public function testIntSanitization(): void
    {
        $this->assertEquals(42, InputSanitizer::int('42'));
        $this->assertEquals(42, InputSanitizer::int(42));
        $this->assertEquals(0, InputSanitizer::int('abc'));
        $this->assertEquals(10, InputSanitizer::int('abc', 10));
    }

    /**
     * Test integer with min/max bounds
     */
    public function testIntWithBounds(): void
    {
        $this->assertEquals(5, InputSanitizer::int('3', 0, 5, 10));
        $this->assertEquals(10, InputSanitizer::int('15', 0, 5, 10));
        $this->assertEquals(7, InputSanitizer::int('7', 0, 5, 10));
    }

    /**
     * Test float sanitization
     */
    public function testFloatSanitization(): void
    {
        $this->assertEquals(3.14, InputSanitizer::float('3.14'));
        $this->assertEquals(0.0, InputSanitizer::float('abc'));
        $this->assertEquals(1.5, InputSanitizer::float('abc', 1.5));
    }

    /**
     * Test float with bounds
     */
    public function testFloatWithBounds(): void
    {
        $this->assertEquals(0.5, InputSanitizer::float('0.3', 0.0, 0.5, 1.0));
        $this->assertEquals(1.0, InputSanitizer::float('1.5', 0.0, 0.5, 1.0));
    }

    /**
     * Test email validation
     */
    public function testEmailValidation(): void
    {
        $this->assertEquals('test@example.com', InputSanitizer::email('test@example.com'));
        $this->assertEquals('user.name+tag@domain.org', InputSanitizer::email('user.name+tag@domain.org'));
        $this->assertNull(InputSanitizer::email('invalid-email'));
        $this->assertNull(InputSanitizer::email('no@tld'));
    }

    /**
     * Test URL validation
     */
    public function testUrlValidation(): void
    {
        $this->assertEquals('https://example.com', InputSanitizer::url('https://example.com'));
        $this->assertEquals('http://test.org/path?q=1', InputSanitizer::url('http://test.org/path?q=1'));
        $this->assertNull(InputSanitizer::url('javascript:alert(1)'));
        $this->assertNull(InputSanitizer::url('ftp://example.com')); // ftp not in default allowed
    }

    /**
     * Test URL with custom allowed schemes
     */
    public function testUrlWithCustomSchemes(): void
    {
        $this->assertEquals('ftp://example.com', InputSanitizer::url('ftp://example.com', ['ftp']));
    }

    /**
     * Test alphanumeric sanitization
     */
    public function testAlphanumericSanitization(): void
    {
        $this->assertEquals('Hello123', InputSanitizer::alphanumeric('Hello123!@#'));
        // alphanumeric keeps letters from <script> tag
        $this->assertEquals('Testscript', InputSanitizer::alphanumeric('Test<script>'));
    }

    /**
     * Test alphanumeric with allowed characters
     */
    public function testAlphanumericWithAllowed(): void
    {
        $this->assertEquals('Hello_World', InputSanitizer::alphanumeric('Hello_World!', '_'));
    }

    /**
     * Test username sanitization
     */
    public function testUsernameSanitization(): void
    {
        $this->assertEquals('player1', InputSanitizer::username('player1'));
        $this->assertEquals('user_name', InputSanitizer::username('user_name'));
        $this->assertEquals('cool-player', InputSanitizer::username('cool-player'));
        $this->assertEquals('testscript', InputSanitizer::username('test<script>'));
    }

    /**
     * Test username max length
     */
    public function testUsernameMaxLength(): void
    {
        $longName = str_repeat('a', 50);
        $sanitized = InputSanitizer::username($longName, 20);

        $this->assertEquals(20, strlen($sanitized));
    }

    /**
     * Test filename sanitization
     */
    public function testFilenameSanitization(): void
    {
        $this->assertEquals('document.pdf', InputSanitizer::filename('document.pdf'));
        $this->assertEquals('my_file.txt', InputSanitizer::filename('my file.txt'));
        // basename() extracts just the filename, stripping path traversal
        $this->assertEquals('passwd', InputSanitizer::filename('../etc/passwd'));
    }

    /**
     * Test SQL LIKE escaping
     */
    public function testSqlLikeEscaping(): void
    {
        $this->assertEquals('100\\%', InputSanitizer::sqlLike('100%'));
        $this->assertEquals('test\\_value', InputSanitizer::sqlLike('test_value'));
        $this->assertEquals('search\\%term', InputSanitizer::sqlLike('search%term'));
    }

    /**
     * Test whitelist validation
     */
    public function testWhitelistValidation(): void
    {
        $whitelist = ['option1', 'option2', 'option3'];

        $this->assertEquals('option1', InputSanitizer::whitelist('option1', $whitelist));
        $this->assertNull(InputSanitizer::whitelist('invalid', $whitelist));
        $this->assertEquals('default', InputSanitizer::whitelist('invalid', $whitelist, 'default'));
    }

    /**
     * Test boolean conversion
     */
    public function testBoolConversion(): void
    {
        $this->assertTrue(InputSanitizer::bool('true'));
        $this->assertTrue(InputSanitizer::bool('1'));
        $this->assertTrue(InputSanitizer::bool('yes'));
        $this->assertTrue(InputSanitizer::bool('on'));
        $this->assertTrue(InputSanitizer::bool(1));

        $this->assertFalse(InputSanitizer::bool('false'));
        $this->assertFalse(InputSanitizer::bool('0'));
        $this->assertFalse(InputSanitizer::bool('no'));
        $this->assertFalse(InputSanitizer::bool(''));
        $this->assertFalse(InputSanitizer::bool(0));
    }

    /**
     * Test array sanitization
     */
    public function testArraySanitization(): void
    {
        $input = ['1', '2', '3', 'abc'];
        $sanitized = InputSanitizer::array($input, fn($v) => InputSanitizer::int($v));

        $this->assertEquals([1, 2, 3, 0], $sanitized);
    }

    /**
     * Test JSON parsing
     */
    public function testJsonParsing(): void
    {
        $json = '{"name": "test", "value": 123}';
        $result = InputSanitizer::json($json);

        $this->assertIsArray($result);
        $this->assertEquals('test', $result['name']);
        $this->assertEquals(123, $result['value']);
    }

    /**
     * Test invalid JSON returns null
     */
    public function testInvalidJsonReturnsNull(): void
    {
        $this->assertNull(InputSanitizer::json('not valid json'));
        $this->assertNull(InputSanitizer::json('{broken:'));
    }

    /**
     * Test string truncation
     */
    public function testTruncate(): void
    {
        $long = 'This is a very long string that needs to be truncated';
        $truncated = InputSanitizer::truncate($long, 20);

        $this->assertEquals(20, strlen($truncated));
    }

    /**
     * Test truncation with suffix
     */
    public function testTruncateWithSuffix(): void
    {
        $long = 'This is a very long string';
        $truncated = InputSanitizer::truncate($long, 15, '...');

        $this->assertEquals(15, strlen($truncated));
        $this->assertStringEndsWith('...', $truncated);
    }

    /**
     * Test control character removal
     */
    public function testRemoveControlChars(): void
    {
        $input = "Hello\x00World\x1F";
        $sanitized = InputSanitizer::removeControlChars($input);

        $this->assertEquals('HelloWorld', $sanitized);
    }

    /**
     * Test control character removal preserves newlines
     */
    public function testRemoveControlCharsPreservesNewlines(): void
    {
        $input = "Line1\nLine2\rLine3";
        $sanitized = InputSanitizer::removeControlChars($input, true);

        $this->assertStringContainsString("\n", $sanitized);
    }

    /**
     * Test whitespace normalization
     */
    public function testNormalizeWhitespace(): void
    {
        $input = "  Multiple   spaces   here  ";
        $sanitized = InputSanitizer::normalizeWhitespace($input);

        $this->assertEquals('Multiple spaces here', $sanitized);
    }

    /**
     * Test legacy escape (for backward compatibility)
     */
    public function testLegacyEscape(): void
    {
        $input = '<script>alert("XSS")</script>';
        $sanitized = InputSanitizer::legacyEscape($input);

        // legacyEscape only replaces angle brackets
        $this->assertStringContainsString('&lt;', $sanitized);
        $this->assertStringContainsString('&gt;', $sanitized);
        $this->assertStringNotContainsString('<', $sanitized);
    }
}
