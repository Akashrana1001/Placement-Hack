import { useState, useEffect } from 'react';
import { getSocket, joinJob, leaveJob } from '../lib/socket';

export const useAgentStream = (jobId) => {
  const [steps, setSteps] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    setSteps([]);
    setIsStreaming(true);
    setError(null);
    joinJob(jobId);

    const socket = getSocket();
    if (!socket) return;

    const handleStep = (data) => {
      setSteps((prev) => [...prev, data]);
      if (data.isDone || (data.action === null && data.isDone)) {
        setIsStreaming(false);
      }
    };

    socket.on('agent:step', handleStep);

    // Timeout safety
    const timeout = setTimeout(() => setIsStreaming(false), 30000);

    return () => {
      clearTimeout(timeout);
      socket.off('agent:step', handleStep);
      leaveJob(jobId);
    };
  }, [jobId]);

  return { steps, isStreaming, latestStep: steps[steps.length - 1], error };
};