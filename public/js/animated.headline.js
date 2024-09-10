jQuery(document).ready(function($) {
    // Animation timing
    var animationDelay = 2500,
        typeLettersDelay = 150,
        selectionDuration = 500,
        typeAnimationDelay = selectionDuration + 800;
    
    initHeadline();

    function initHeadline() {
        // Insert <i> element for each letter of a changing word
        singleLetters($('.cd-headline.letters').find('b'));
        // Initialise headline animation
        animateHeadline($('.cd-headline'));
    }

    function singleLetters($words) {
        $words.each(function() {
            var word = $(this),
                letters = word.text().split('');
            letters = letters.map(letter => `<i>${letter}</i>`).join('');
            word.html(letters).css('opacity', 1);
        });
    }

    function animateHeadline($headlines) {
        $headlines.each(function() {
            var headline = $(this);
            setTimeout(function() {
                hideWord(headline.find('.is-visible').eq(0));
            }, animationDelay);
        });
    }

    function hideWord($word) {
        var nextWord = takeNext($word);
        $word.removeClass('is-visible').addClass('is-hidden').children('i').removeClass('in').addClass('out');
        
        setTimeout(function() {
            showWord(nextWord);
        }, typeAnimationDelay);
    }

    function showWord($word) {
        $word.addClass('is-visible').removeClass('is-hidden').find('i').addClass('in').removeClass('out');
        setTimeout(function() {
            hideWord($word);
        }, animationDelay);
    }

    function takeNext($word) {
        return (!$word.is(':last-child')) ? $word.next() : $word.parent().children().eq(0);
    }
});
