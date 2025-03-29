import { useQueryClient } from "@tanstack/react-query";
import React from "react";

const useRefetch = () => {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.refetchQueries({
      // Refetch all queries
      type: "active",
    });
  };
};

export default useRefetch;
