<?php

require_once( DOCUMENT_ROOT . "/lib-app/php/dao/abstract_dao.php" ) ;

class CardLearningSummaryDAO extends AbstractDAO {

    private $logger ;

    function __construct() {
        parent::__construct() ;
        $this->logger = Logger::getLogger( __CLASS__ ) ;
    }

  /** 
   * Refreshes the card_learning_summary by adding all those cards which have
   * been added new and have not yet been practiced by the user. This ensures
   * that the card_learning_summary table, post the refresh gives an accurate
   * count of #NS, L0.. MAS cards versus the current number of cards in the 
   * chapter.
   *
   * Note that cards can get added or removed at runtime (based on notes 
   * modifications). While the sync on removal is taken care by the cascade
   * of foreign key, the addition of new cards is handled by refreshing the table.
   */
    function refresh( $userName ) {

$query = <<< QUERY
insert into jove_notes.card_learning_summary
( chapter_id, notes_element_id, card_id, student_name )
select c.chapter_id, c.notes_element_id, c.card_id, '$userName'
from
  jove_notes.card c left join
  jove_notes.card_learning_summary ls
on
  c.card_id = ls.card_id 
where
  ls.chapter_id IS NULL
QUERY;

        parent::executeInsert( $query ) ;
    }

    function updateSummary( $userName, $cardId, $level, $rating, $learningEfficiency ) {

$query = <<< QUERY
update jove_notes.card_learning_summary
set
  current_level = '$level',
    num_attempts  = num_attempts + 1,
    temporal_ratings = CONCAT( temporal_ratings, '$rating' ),
    learning_efficiency = $learningEfficiency,
  last_attempt_time = CURRENT_TIMESTAMP
where
  student_name = '$userName' and
  card_id = $cardId
QUERY;

        parent::executeUpdate( $query ) ;
    }

    function getCardLearningSummary( $userName, $cardId ) {

$query = <<< QUERY
select 
  cls.current_level, cls.num_attempts, cls.temporal_ratings, 
  cls.learning_efficiency, cls.last_attempt_time,
  c.difficulty_level
from 
  jove_notes.card_learning_summary cls,
  jove_notes.card c
where
  cls.student_name = '$userName' and
  cls.card_id = $cardId and
  cls.card_id = c.card_id
QUERY;

        $colNames = [ "current_level", "num_attempts", "temporal_ratings", 
                      "learning_efficiency", "last_attempt_time", 
                      "difficulty_level" ] ;

        return parent::getResultAsAssociativeArray( $query, $colNames ) ;
    }
}
?>

