import { createToaster } from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
  offsets: { top: "0px", left: "0px", bottom: "24px", right: "24px" },
});
