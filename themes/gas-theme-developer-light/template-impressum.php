<?php
/**
 * Template: Impressum / Legal Disclosure
 * Same layout as Terms & Conditions — no page hero, clean content.
 */

get_header();

$page_title = get_the_title() ?: 'Impressum';
?>

<main id="primary" class="site-main">

    <!-- Page Header -->
    <section class="developer-section" style="background: #f8fafc; padding: 120px 0 50px;">
        <div class="developer-container" style="text-align: center;">
            <h1 style="margin-bottom: 0.5rem;"><?php echo esc_html($page_title); ?></h1>
        </div>
    </section>

    <section class="developer-section" style="background: #ffffff; padding: 50px 0;">
        <div class="developer-container">
            <div class="developer-terms-content">
                <div class="developer-terms-text">
                    <?php the_content(); ?>
                </div>
            </div>
        </div>
    </section>

</main>

<style>
.developer-terms-content {
    max-width: 800px;
    margin: 0 auto;
}
.developer-terms-content h2 {
    font-size: 1.5rem;
    color: #1e293b;
    margin: 2rem 0 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}
.developer-terms-content h3 {
    font-size: 1.2rem;
    color: #1e293b;
    margin: 1.5rem 0 0.75rem;
    font-weight: 600;
}
.developer-terms-text p {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
}
.developer-terms-text hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 2.5rem 0;
}
.developer-terms-text a {
    color: #2563eb;
    text-decoration: none;
}
.developer-terms-text a:hover {
    text-decoration: underline;
}
</style>

<?php get_footer(); ?>