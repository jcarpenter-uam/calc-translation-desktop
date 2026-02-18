import { useLocation, useParams } from "react-router-dom";

export function useSessionRoute() {
  const params = useParams();
  const location = useLocation();
  const query = new URLSearchParams(location.search);

  return {
    integration: params.integration,
    sessionId: params["*"],
    token: query.get("token"),
  };
}
