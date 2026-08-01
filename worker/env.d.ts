/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    ANALYTICS: AnalyticsEngineDataset;
  }
}

interface Env extends Cloudflare.Env {}
