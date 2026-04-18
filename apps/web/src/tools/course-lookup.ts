import type { Course } from "@organizaTUM/shared";
import coursesData from "@/data/courses.json";

const courses = coursesData as Course[];

export async function lookupCourses(courseIds: string[]): Promise<Course[]> {
  if (courseIds.length === 0) return courses;
  return courses.filter((c) => courseIds.includes(c.id));
}

export async function getAllCourses(): Promise<Course[]> {
  return courses;
}
