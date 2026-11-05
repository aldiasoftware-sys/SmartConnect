import { Post, TEMPLATE_DAY, WEEK_TEMPLATE, addDays, today } from "./social";
import { saveRow } from "./store";

/** Mete la semana tipo en el calendario desde hoy en adelante (los días pasados no se rellenan: serían fallos falsos);
 *  no duplica un hueco si esa red ya tiene algo ese día (1 publicación al día por red). */
export async function loadWeekTemplate(week: string, existing: Post[]) {
  let n = 0;
  for (let i = 0; i < WEEK_TEMPLATE.length; i++) {
    const date = addDays(week, TEMPLATE_DAY[i]);
    if (date < today()) continue;
    if (existing.some((p) => p.publish_date === date && p.platform === WEEK_TEMPLATE[i].platform)) continue;
    await saveRow<Post>("content_posts", { ...WEEK_TEMPLATE[i], publish_date: date });
    n++;
  }
  return n;
}
