"use client";

import { useState } from "react";
import { msalConfig } from "@/lib/msalConfig";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [instance] = useState(() => new PublicClientApplication(msalConfig));
  return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
