export interface Group {
  id: string;
  name: string;
  about?: string;
  picture?: string;
  private: boolean;
  closed: boolean;
  invites?: string[];
  joinRequests?: string[];
  content?: string;
}
