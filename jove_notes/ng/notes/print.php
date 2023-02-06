<?php
require_once( $_SERVER[ "DOCUMENT_ROOT" ] . "/apps/jove_notes/php/app_bootstrap.php" ) ;

require_once( DOCUMENT_ROOT . "/apps/jove_notes/php/dao/chapter_dao.php" ) ;

if( !isset( $_REQUEST['chapterId'] ) ) {
    HTTPUtils::redirectTo( "/" ) ;
}

global $log ;
$log->info( "Rendering notes for chapter " . $_REQUEST[ 'chapterId' ] . 
            " and user " . ExecutionContext::getCurrentUserName() ) ;

// Check if the user has access to notes for the requested chapter.
$chapterDAO = new ChapterDAO() ;
$guard = $chapterDAO->getChapterGuard( $_REQUEST[ 'chapterId' ] ) ;
if( !Authorizer::hasAccess( $guard, "NOTES" ) ) {
    HTTPUtils::redirectTo( ServerContext::getUnauthRedirPage() ) ;
    return ;
}

// The user has access to notes of this chapter. Proceed with rendering of the page.
$pageConfig = array(
	"tab_title"  => "Chapter Notes"
) ;

define( "FRAGMENT_PATH",          "/apps/jove_notes/ng/notes/html_fragments" ) ;

define( "WM_FRAGMENT_PATH",       FRAGMENT_PATH . "/wm_template.html" ) ;
define( "QA_FRAGMENT_PATH",       FRAGMENT_PATH . "/qa_template.html" ) ;
define( "FIB_FRAGMENT_PATH",      FRAGMENT_PATH . "/fib_template.html" ) ;
define( "DEFN_FRAGMENT_PATH",     FRAGMENT_PATH . "/definition_template.html" ) ;
define( "CHAR_FRAGMENT_PATH",     FRAGMENT_PATH . "/character_template.html" ) ;
define( "TN_FRAGMENT_PATH",       FRAGMENT_PATH . "/teacher_note_template.html" ) ;
define( "MATCH_FRAGMENT_PATH",    FRAGMENT_PATH . "/matching_template.html" ) ;
define( "EVENT_FRAGMENT_PATH",    FRAGMENT_PATH . "/event_template.html" ) ;
define( "TF_FRAGMENT_PATH",       FRAGMENT_PATH . "/true_false_template.html" ) ;
define( "CHEM_EQ_FRAGMENT_PATH",  FRAGMENT_PATH . "/chem_equation_template.html" ) ;
define( "CHEM_CMP_FRAGMENT_PATH", FRAGMENT_PATH . "/chem_compound_template.html" ) ;
define( "SPELLBEE_FRAGMENT_PATH", FRAGMENT_PATH . "/spellbee_template.html" ) ;
define( "IMGLABEL_FRAGMENT_PATH", FRAGMENT_PATH . "/image_label_template.html" ) ;
define( "EQUATION_FRAGMENT_PATH", FRAGMENT_PATH . "/equation_template.html" ) ;
define( "RTC_FRAGMENT_PATH",      FRAGMENT_PATH . "/rtc_template.html" ) ;
define( "MC_FRAGMENT_PATH",       FRAGMENT_PATH . "/mc_template.html" ) ;

define( "PHP_FRAGMENT_PATH",      DOCUMENT_ROOT . "/apps/jove_notes/ng/notes/php_fragments" ) ;
define( "NAVBAR_FRAGMENT_PATH",   PHP_FRAGMENT_PATH . "/notes_navbar.php" ) ;
?>

<!DOCTYPE html>
<html ng-app="notesApp">

<head>
    <?php include( HEAD_CONTENT_FILE ); ?>

    <link rel='stylesheet' href='/lib-ext/pure/tables.css'>
    <link rel='stylesheet' href='/apps/jove_notes/ng/flashcard/flashcard.css'>
    <link rel='stylesheet' href='/apps/jove_notes/ng/notes/notes.css'>

    <script type="text/x-mathjax-config">
        MathJax.Hub.Config({ 
            TeX: { extensions: ["mhchem.js"] },
            displayAlign: "left"
        });
    </script>
    <script type="text/javascript" src="/lib-ext/MathJax/MathJax.js?config=TeX-AMS-MML_SVG-full"></script>

    <script src="/apps/jove_notes/ng/_common/jove_notes_utils.js"></script>    
    <script src="/apps/jove_notes/ng/_common/question_utils.js"></script>    
    <script src="/apps/jove_notes/ng/_common/script_utilities.js"></script>    

    <script src="/apps/jove_notes/ng/flashcard/practice_page/dynq_imglabel.js"></script>    

    <script src="/apps/jove_notes/ng/notes/ne_formatter.js"></script>    

    <script src="/apps/jove_notes/ng/notes/routes.js"></script>    
    <script src="/apps/jove_notes/ng/notes/directives.js"></script>    
    <script src="/apps/jove_notes/ng/notes/controllers.js"></script>    

    <script>
    var userName = '<?php echo ExecutionContext::getCurrentUserName() ?>' ;
    var chapterId = <?php echo $_REQUEST[ 'chapterId' ] ?> ;
    </script>
</head>

<body ng-controller="NotesController" onload="MathJax.Hub.Queue( ['Typeset', MathJax.Hub] )">

    <div style="background:black;color:white;">
        <img src="<?php echo APP_LOGO_PATH ?>" 
             style="height: 30px"/>
        &nbsp;&nbsp;&nbsp;
        <b style="font-size:20px">{{pageTitle}}</b>
    </div>
    <p>
    
    <div ng-show="notesLayoutMode == 'linear'"
         ng-init="ng=linearNEGroup" 
         ng-include="'html_fragments/layout/linear_layout.html'">
    </div>

    <div ng-show="notesLayoutMode == 'sections'">
         <div ng-repeat="ngGroup in sectionNEGroups"
              style="page-break-inside:avoid;">
            <h1 class="section-header">{{ngGroup.sectionName}}</h1>
            <div ng-init="ng=ngGroup.neGroup" 
                 ng-include="'html_fragments/layout/linear_layout.html'"
                 style="padding-left: 20px;">
            </div>
         </div>
    </div>

</body>

</html>