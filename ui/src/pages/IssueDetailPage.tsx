import { useParams } from "react-router-dom";
import { useState } from "react";
import { useCompany } from "../context/CompanyContext";
import { useApi } from "../hooks/useApi";
import { issuesApi } from "../api/issues";
import { StatusBadge } from "../components/StatusBadge";

export function IssueDetailPage() {
  const { issueId } = useParams();
  const { companyId } = useCompany();
  const { data: issue } = useApi(() => issuesApi.get(companyId!, issueId!), [companyId, issueId]);
  const { data: comments, refresh: refreshComments } = useApi(
    () => issuesApi.comments(companyId!, issueId!),
    [companyId, issueId],
  );
  const [newComment, setNewComment] = useState("");

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await issuesApi.addComment(companyId!, issueId!, newComment);
    setNewComment("");
    refreshComments();
  };

  if (!issue) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-mono text-gray-500">{issue.identifier}</span>
        <StatusBadge status={issue.status} />
        <StatusBadge status={issue.priority} />
      </div>
      <h2 className="text-2xl font-bold mb-6">{issue.title}</h2>
      {issue.description && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{issue.description}</p>
        </div>
      )}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="font-semibold mb-4">Comments ({comments?.length ?? 0})</h3>
        <div className="space-y-4 mb-6">
          {comments?.map((c: any) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-4">
              <p className="text-xs text-gray-500 mb-1">
                {c.authorAgentId ? "Agent" : "User"} &middot; {new Date(c.createdAt).toLocaleString()}
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
