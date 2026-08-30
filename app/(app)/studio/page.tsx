import { redirect } from "next/navigation";

/**
 * Studio no longer keeps its own list of games. It listed exactly the same
 * objects as the film library with different buttons, which is how the product
 * ended up with two of everything. One library; you enter a game either to take
 * reps or to author them. The route stays so existing links keep working.
 */
export default function StudioIndexPage() {
  redirect("/games");
}
