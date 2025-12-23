# X Imperium - Docker Configuration
# PHP 8.2 with Apache

FROM php:8.2-apache

# Install PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mysqli \
        gd \
        zip \
        mbstring \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Enable Apache modules
RUN a2enmod rewrite headers

# Configure PHP
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Custom PHP settings
RUN echo "session.cookie_httponly = On" >> "$PHP_INI_DIR/conf.d/security.ini" \
    && echo "session.cookie_secure = Off" >> "$PHP_INI_DIR/conf.d/security.ini" \
    && echo "session.use_strict_mode = On" >> "$PHP_INI_DIR/conf.d/security.ini" \
    && echo "expose_php = Off" >> "$PHP_INI_DIR/conf.d/security.ini" \
    && echo "display_errors = Off" >> "$PHP_INI_DIR/conf.d/security.ini" \
    && echo "log_errors = On" >> "$PHP_INI_DIR/conf.d/security.ini"

# Set timezone
RUN echo "date.timezone = UTC" >> "$PHP_INI_DIR/conf.d/timezone.ini"

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY --chown=www-data:www-data . /var/www/html/

# Create required directories with proper permissions
RUN mkdir -p templates_c/system templates_c/game templates_c/installer templates_c/xml/system \
    && chown -R www-data:www-data templates_c \
    && chmod -R 775 templates_c

# Remove install.php - not needed in Docker deployment
RUN rm -f /var/www/html/install.php

# Apache configuration
RUN echo '<Directory /var/www/html>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/ximperium.conf \
    && a2enconf ximperium

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
