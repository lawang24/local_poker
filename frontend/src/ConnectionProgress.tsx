import { useEffect, useState } from "react";

const estimatedWakeSeconds = 60;

export function ConnectionProgress({ loadingTable }: { loadingTable: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const title = loadingTable ? "Loading the table" : "Connecting to the server";
  const remaining = estimatedWakeSeconds - seconds;
  // Round up to ten-second intervals to convey the precision of the estimate.
  const roundedRemaining = Math.ceil(remaining / 10) * 10;
  const showEstimate = !loadingTable && seconds >= 3 && remaining > 0;
  const detail = loadingTable ? "Waiting for the first table update."
    : remaining <= 0 ? "This is taking longer than estimated. We’ll keep trying automatically."
    : "The server may be waking up. This page will connect automatically.";

  return <section className="panel connection-progress">
    <div role="status">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
    <div className="connection-track" role="progressbar" aria-label={title} />
    {showEstimate && <p className="connection-estimate">
      {roundedRemaining === 60 ? "About 1 minute" : `About ${roundedRemaining} seconds`} remaining
    </p>}
    <small>{seconds}s elapsed</small>
  </section>;
}
