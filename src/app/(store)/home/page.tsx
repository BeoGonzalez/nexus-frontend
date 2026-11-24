import { permanentRedirect } from "next/navigation";

/** /home is an alias: the store's home lives at "/" (route group (store)). */
export default function HomeAlias() {
  permanentRedirect("/");
}
