import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/demo?view=host");
}
