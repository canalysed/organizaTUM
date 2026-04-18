import type { Course } from "@organizaTUM/shared";
import coursesData from "@/data/courses.json";

const mockCourses = coursesData as Course[];

export function lookupCourses(courseIds: string[], tumCourses?: Course[] | null): Course[] {
  const source = tumCourses ?? mockCourses;
  if (courseIds.length === 0) return source;
  return source.filter((c) => courseIds.includes(c.id));
}

export function getAllCourses(tumCourses?: Course[] | null): Course[] {
  return tumCourses ?? mockCourses;
}
