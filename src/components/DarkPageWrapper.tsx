import { ReactNode } from "react";

const DarkPageWrapper = ({ children }: { children: ReactNode }) => (
  <div className="dark">{children}</div>
);

export default DarkPageWrapper;
