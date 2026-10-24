"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

/** A flat wallet button (extruded buttons are kept for Save and Withdraw only). */
export function Connect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        if (!mounted)
          return (
            <button className="btn-flat" type="button" aria-hidden="true" tabIndex={-1} style={{ visibility: "hidden" }}>
              Connect wallet
            </button>
          );
        if (!account)
          return (
            <button className="btn-flat" type="button" onClick={openConnectModal}>
              Connect wallet
            </button>
          );
        if (chain?.unsupported)
          return (
            <button className="btn-flat btn-flat--warn" type="button" onClick={openChainModal}>
              Wrong network
            </button>
          );
        return (
          <button className="btn-flat" type="button" onClick={openAccountModal}>
            <span className="live-dot" aria-hidden="true" />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
