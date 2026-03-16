const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-100 text-green-800",
  running: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  claimed: "bg-blue-100 text-blue-800",
  backlog: "bg-gray-100 text-gray-800",
  todo: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  in_review: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  planned: "bg-blue-100 text-blue-800",
  achieved: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
