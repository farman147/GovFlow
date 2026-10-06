import EmptyState from '../citizen/EmptyState';
import QueueTokenCard from './QueueTokenCard';

export default function QueueList({ queue, serviceName, onAction, disabled = false }) {
  if (!queue || queue.length === 0) {
    return (
      <EmptyState
        title="No tokens waiting"
        message="The queue for this service is currently empty."
      />
    );
  }

  return (
    <div className="space-y-4">
      {queue.map((token) => (
        <QueueTokenCard key={token._id} token={token} serviceName={serviceName} onAction={onAction} disabled={disabled} />
      ))}
    </div>
  );
}
