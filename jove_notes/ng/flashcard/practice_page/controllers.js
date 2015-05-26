flashCardApp.controller( 'PracticePageController', function( $scope, $http, $routeParams, $location ) {
// -----------------------------------------------------------------------------

// ---------------- Constants and inner class definition -----------------------
var SSR_DELTA_L0 = 24*60*60*1000 ;
var SSR_DELTA_L1 = SSR_DELTA_L0 * 2 ;
var SSR_DELTA_L2 = SSR_DELTA_L0 * 3 ;
var SSR_DELTA_L3 = SSR_DELTA_L0 * 4  ;

// ---------------- Local variables --------------------------------------------
var ratingMatrix = new RatingMatrix() ;

var currentQuestionShowStartTime = 0 ;
var durationTillNowInMillis = 0 ;

var sessionStartTime = new Date().getTime() ;
var sessionActive    = true ;
var oldBodyTop       = 0 ;
var oldBodyBottom    = 0 ;

// ---------------- Controller variables ---------------------------------------
$scope.showL0Header     = true ;
$scope.showL1Header     = true ;
$scope.showL2Header     = true ;
$scope.showAuxControls  = false ;
$scope.showFooterDropup = true ;

$scope.bodyDivStyle = { top : 75, bottom : 60 } ;

$scope.questionsForSession = [] ;
$scope.currentQuestion  = null ;

$scope.answerChangeTrigger = "" ;
$scope.answerAlign = "center" ;

// questionMode is used by the view to show the appropriate controls when either
// the question or the answer is shown.
$scope.questionMode = false ;

// ---------------- Main logic for the controller ------------------------------
{
	log.debug( "Executing PracticePageController." ) ;
	if( checkInvalidLoad() ) {
		log.debug( "Invalid refresh detected. Returning to start page." ) ;
		return ;
	}


	log.debug( "Serializing study criteria." ) ;
	$scope.$parent.studyCriteria.serialize() ;

	log.debug( "Computing session cards." ) ;
	computeSessionCards() ;

	if( $scope.$parent.sessionStats.numCards == 0 ) {
		$scope.$parent.messageForEndPage = "Filter criteria did not select any cards." ;
		endSession() ;
		return ;
	}

	log.debug( "Starting timer." ) ;
	setTimeout( handleTimerEvent, 1000 ) ;

	onWindowResize() ;
	window.addEventListener( "resize", onWindowResize ) ;
	showNextCard() ;
}

// ---------------- Controller methods -----------------------------------------
$scope.toggleDisplay = function( displayId ) {

	if( displayId == "L0-Hdr" ) { 
		$scope.showL0Header = !$scope.showL0Header ;
	}
	else if( displayId == "L1-Hdr" ) { 
		$scope.showL1Header = !$scope.showL1Header ; 
	}
	else if( displayId == "L2-Hdr" ) { 
		$scope.showL2Header = !$scope.showL2Header ; 
	}
	else if( displayId == "AuxControls" ) { 
		$scope.showAuxControls = !$scope.showAuxControls ; 
	}
	setTimeout( resizeBody, 10 ) ;
}

$scope.randomizeCards = function() {
	log.debug( "Randomizing remaining cards." ) ;
	$scope.questionsForSession.shuffle() ;
}

$scope.endSession = function() {
	log.debug( "Ending current session." ) ;
	endSession() ;
}

$scope.purgeCard = function() {
	log.debug( "Purging current card." ) ;
	
	$scope.$parent.sessionStats.numCards-- ;
	$scope.$parent.sessionStats.numCardsLeft-- ;
	showNextCard() ;
}

$scope.markCardForEdit = function() {
	alert( "Mark card for edit." ) ;
}

$scope.rateCard = function( rating ) {
	log.debug( "Rating current card as " + rating )	 ;

	var curLevel   = $scope.currentQuestion.learningStats.currentLevel ;
	var nextLevel  = ratingMatrix.getNextLevel( curLevel, rating ) ;
	var nextAction = ratingMatrix.getNextAction( curLevel, rating ) ;

	$scope.questionsForSession.shift() ;

	processNextAction( nextAction ) ;
	updateLearningStatsForCurrentQuestion( rating, nextLevel ) ;
	updateLearningStatsForChapter( curLevel, nextLevel ) ;
	updateSessionStats() ;

	log.debug( "Current level = " + curLevel ) ;
	log.debug( "Next level    = " + nextLevel ) ;
	log.debug( "Next action   = " + nextAction ) ;
	log.debug( "Num attmepts  = " + $scope.currentQuestion.learningStats.numAttemptsInSession ) ;
	log.debug( "Time spent    = " + $scope.currentQuestion.learningStats.numSecondsInSession ) ;
	
	// TODO: Compute the score 
	// TODO: Initiate asynchronous communication with server to save ratings
	showNextCard() ;
}

$scope.showAnswer = function() {

	$scope.answerChangeTrigger = "Answer" + $scope.currentQuestion.questionId ;
	$scope.questionMode = false ;
}

// ---------------- Private functions ------------------------------------------
function updateLearningStatsForCurrentQuestion( rating, nextLevel ) {

	var delta = ( new Date().getTime() - currentQuestionShowStartTime )/1000 ;

	$scope.currentQuestion.learningStats.numAttempts++ ;
	$scope.currentQuestion.learningStats.numAttemptsInSession++ ;
	$scope.currentQuestion.learningStats.currentLevel = nextLevel ;
	$scope.currentQuestion.learningStats.temporalScores.push( rating ) ;
    $scope.currentQuestion.learningStats.numSecondsInSession += delta ;
    $scope.currentQuestion.learningStats.lastAttemptTime = new Date().getTime() ;
}

function updateLearningStatsForChapter( curLevel, nextLevel ) {

	$scope.$parent.progressSnapshot[ 'num' + curLevel  ]-- ;
	$scope.$parent.progressSnapshot[ 'num' + nextLevel ]++ ;
}

function updateSessionStats() {

	$scope.$parent.sessionStats.numCardsLeft = $scope.questionsForSession.length ;
	$scope.$parent.sessionStats.numCardsAnswered++ ;
}

function processNextAction( actionValue ) {

	if( actionValue != -1 ) {
		var newPos = $scope.questionsForSession.length * actionValue + 1 ;
        $scope.questionsForSession.splice( newPos, 0, $scope.currentQuestion ) ;
	}
}

function showNextCard() {

	if( !hasSessionEnded() ) {

		$scope.currentQuestion = $scope.questionsForSession[0] ;
		var answerLength = $scope.currentQuestion.handler.getAnswerLength() ;

		log.debug( "Answer length = " + answerLength ) ;

		$scope.questionMode = true ;
		$scope.answerChangeTrigger = "" ;
		$scope.answerAlign = answerLength < 100 ? "center" : "left" ;
		log.debug( "Answer align = " + $scope.answerAlign ) ;

		currentQuestionShowStartTime = new Date().getTime() ;
	}
	else {
		endSession() ;
	}
}

function endSession() {

	// This will stop the timer at the next click
	sessionActive = false ;

	var currentSnapshot = [ 
		$scope.$parent.progressSnapshot.numNS,
		$scope.$parent.progressSnapshot.numL0,
		$scope.$parent.progressSnapshot.numL1,
		$scope.$parent.progressSnapshot.numL2,
		$scope.$parent.progressSnapshot.numL2,
		$scope.$parent.progressSnapshot.numMAS
	] ;
	$scope.$parent.learningCurveData.push( currentSnapshot ) ;
	
	$location.path( "/EndPage" ) ;
}

function hasSessionEnded() {

	if( $scope.$parent.studyCriteria.maxTime != -1 ) {
		if( durationTillNowInMillis >= $scope.$parent.studyCriteria.maxTime*60*1000 ) {
			return true ;
		}
	}

	if( $scope.questionsForSession.length == 0 ) {
		return true ;
	}
	return false ;
}

function checkInvalidLoad() {
	if( $scope.$parent.progressSnapshot == null ) {
		$location.path( "/StartPage" ) ;
		return true ;
	}
	return false ;
}

function computeSessionCards() {

	$scope.questionsForSession.length = 0 ;
	
	log.debug( "Computing cards for this session." ) ;
	log.debug( "\tTotal cards in chapter = " + $scope.$parent.questions.length ) ;

	applyStudyCriteriaFilter() ;
	sortCardsAsPerStudyStrategy() ;
	addNSCards() ;
	trimCardsAsPerBounds() ;

	$scope.$parent.sessionStats.numCards     = $scope.questionsForSession.length ;
	$scope.$parent.sessionStats.numCardsLeft = $scope.questionsForSession.length ;
}

function applyStudyCriteriaFilter() {

	log.debug( "\tApplying study criteria filter." ) ;
	for( var i=0; i < $scope.$parent.questions.length ; i++ ) {
		var question = $scope.$parent.questions[ i ] ;
		if( $scope.$parent.studyCriteria.matchesFilter( question ) ) {
			$scope.questionsForSession.push( question ) ;
		}
	}
	log.debug( "\t\t#Q after filtering = " + $scope.questionsForSession.length ) ;
}

function sortCardsAsPerStudyStrategy() {
	
	if( $scope.questionsForSession.length <= 0 ) { return; }

	var strategy = $scope.studyCriteria.strategy ;
	if( strategy == StudyStrategyTypes.prototype.SSR ) {
		log.debug( "\tFiltering cards as per SSR study strategy." ) ;
		filterCardsForSSRStrategy() ;

		if( $scope.questionsForSession.length > 0 ) {
	        $scope.questionsForSession.sort( function( q1, q2 ){

	        	var tlaCard1 = getSSRThresholdDelta( q1 ) ;
	        	var tlaCard2 = getSSRThresholdDelta( q2 ) ;

	            return tlaCard2 - tlaCard1 ;
	        }) ;
		}
	}
	else if( strategy == StudyStrategyTypes.prototype.EFF_HARD ) {
		log.debug( "\tSorting cards as per EFF_HARD study strategy." ) ;
        $scope.questionsForSession.sort( function( q1, q2 ){
            return q2.learningStats.learningEfficiency - 
                   q1.learningStats.learningEfficiency  ;
        }) ;
	}
	else if( strategy == StudyStrategyTypes.prototype.EFF_EASY ) {
		log.debug( "\tSorting cards as per EFF_EASY study strategy." ) ;
        $scope.questionsForSession.sort( function( q1, q2 ){
            return q1.learningStats.learningEfficiency - 
                   q2.learningStats.learningEfficiency  ;
        }) ;
	}
	else if( strategy == StudyStrategyTypes.prototype.OBJECTIVE ) {
		log.debug( "\tSorting cards as per OBJECTIVE study strategy." ) ;
        $scope.questionsForSession.sort( function( q1, q2 ){
            return q1.handler.getAnswerLength() - q2.handler.getAnswerLength() ;
        }) ;
	}
	else if( strategy == StudyStrategyTypes.prototype.SUBJECTIVE ) {
		log.debug( "\tSorting cards as per SUBJECTIVE study strategy." ) ;
        $scope.questionsForSession.sort( function( q1, q2 ){
            return q2.handler.getAnswerLength() - q1.handler.getAnswerLength() ;
        }) ;
	} 

	log.debug( "\t#cards after applying study strategy = " + 
		       $scope.questionsForSession.length ) ;
}

function filterCardsForSSRStrategy() {
	
	var ssrFilteredQuestions = [] ;
	var index = 0 ;

	for( index=0; index<$scope.questionsForSession.length; index++ ) {
		var question = $scope.questionsForSession[index] ;
		var thresholdDelta = getSSRThresholdDelta( question ) ;

		if( thresholdDelta >= 0 ) {
			ssrFilteredQuestions.push( question ) ;
		}
	}

	$scope.questionsForSession = ssrFilteredQuestions ;
}

function getSSRThresholdDelta( question ) {

	var currentLevel = question.learningStats.currentLevel ;
	var timeSinceLastAttempt = new Date().getTime() - 
	                           question.learningStats.lastAttemptTime ;
	var delta = -1 ;

	if( CardLevels.prototype.L0 == currentLevel ) {
		delta = timeSinceLastAttempt - SSR_DELTA_L0 ;
	}
	else if( CardLevels.prototype.L1 == currentLevel ) {
		delta = timeSinceLastAttempt - SSR_DELTA_L1 ;
	}
	else if( CardLevels.prototype.L2 == currentLevel ) {
		delta = timeSinceLastAttempt - SSR_DELTA_L2 ;
	}
	else if( CardLevels.prototype.L3 == currentLevel ) {
		delta = timeSinceLastAttempt - SSR_DELTA_L3 ;
	}
	return delta ;
}

function addNSCards() {

	log.debug( "\tAdding NS cards." ) ;
	var nsQuestionsAdded = 0 ;
	if( $scope.$parent.studyCriteria.maxNewCards > 0 ) {
		for( var i=0 ; i < $scope.$parent.questions.length ; i++ ) {

			var question = $scope.$parent.questions[ i ] ;
			if( question.learningStats.currentLevel == CardLevels.prototype.NS ) {

				$scope.questionsForSession.unshift( question ) ;
				nsQuestionsAdded++ ;
				if( nsQuestionsAdded >= $scope.$parent.maxNewCards ) {
					break ;
				}
			}
		}
	}
	log.debug( "\t\tAdded " + nsQuestionsAdded + " NS questions." ) ;
}

function trimCardsAsPerBounds() {
	
	log.debug( "\tTrimming cards as per max cards bound. " + 
		       $scope.$parent.studyCriteria.maxCards ) ;

	while( $scope.questionsForSession.length > $scope.$parent.studyCriteria.maxCards ) {
		$scope.questionsForSession.pop() ;		
	}
	log.debug( "\t\t#cards after trimming " + $scope.questionsForSession.length ) ;
}

function handleTimerEvent() {
	if( sessionActive ) {
		refreshClocks() ;
		setTimeout( handleTimerEvent, 1000 ) ;
	}
}

function refreshClocks() {

	durationTillNowInMillis = new Date().getTime() - sessionStartTime ;

	$scope.$parent.timePerQuestion = durationTillNowInMillis / 
	                         ( $scope.$parent.sessionStats.numCardsAnswered + 1 ) ;

	if( $scope.$parent.studyCriteria.maxTime != -1 ) {

		var timeLeftInMillis = $scope.$parent.studyCriteria.maxTime * 60 * 1000 -
		                       durationTillNowInMillis ;
		if( timeLeftInMillis <= 0 ) {
			sessionActive = false ;
		}
		else {
			$scope.$parent.sessionDuration = timeLeftInMillis ;
		}
	}
	else {
		$scope.$parent.sessionDuration = durationTillNowInMillis ;
	}
	$scope.$digest() ;
}

function onWindowResize() {

	if( window.innerWidth < 700 ) {

		$scope.showL0Header     = false ;
		$scope.showL1Header     = false ;
		$scope.showL2Header     = true ;
		$scope.showAuxControls  = false ;
		$scope.showFooterDropup = false ;
	}
	else {
		if( !$scope.showFooterDropup ) {
			$scope.showFooterDropup = true ;
			$scope.showL0Header     = true ;
			$scope.showL1Header     = true ;
			$scope.showL2Header     = true ;
			$scope.showAuxControls  = false ;
		}
	}
	setTimeout( resizeBody, 10 ) ;
}

function resizeBody() {

	var curBodyTop    = getDivHeight( 'flashcard-hdr-div' ) ;
	var curBodyBottom = getDivHeight( 'flashcard-footer-div' ) ;

	if( ( curBodyTop != oldBodyTop ) || ( curBodyBottom != oldBodyBottom ) ) {
		oldBodyTop = curBodyTop ;
		oldBodyBottom = curBodyBottom ;

		$scope.bodyDivStyle = {
			top    : oldBodyTop,
			bottom : oldBodyBottom
		} ;
		$scope.$digest() ;
	}
}

function getDivHeight( divName ) {

	var div = document.getElementById( divName ) ;
	if( div != null ) {
		return div.offsetHeight ;
	}
	else return 0 ;
}

// ---------------- End of controller ------------------------------------------
} ) ; 