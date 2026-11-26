import CommentsTarjet from "./CommentsTarjet";

function CommentsList({ comments = [], onToggleFavorite, onToggleLike, onToggleFollow, pendingFollow,
  onReplyCreated, onUpdatePost, onDeletePost, onReportContent }) {
  return (
    <div className="comunidad-post-list">
      {comments.map((comment) => (
        <CommentsTarjet
          key={comment.id}
          comment={comment}
          onToggleFavorite={onToggleFavorite}
          onToggleLike={onToggleLike}
          onToggleFollow={onToggleFollow}
          pendingFollow={pendingFollow}
          onReplyCreated={onReplyCreated}
          onUpdatePost={onUpdatePost}
          onDeletePost={onDeletePost}
          onReportContent={onReportContent}
        />
      ))}
    </div>
  );
}

export default CommentsList
