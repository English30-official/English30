import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ContentStatus, Course, Lesson, LevelCode } from '../types';
import { ownerCoursesService } from '../services/ownerCoursesService';

const initialForm = { titleAr: '', titleEn: '', level: 'A1' as LevelCode, unitNumber: 1, durationMinutes: 15, summaryAr: '', arabicExplanation: '', status: 'draft' as ContentStatus };

export function useOwnerCoursesCMS() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [newLessonData, setNewLessonData] = useState(initialForm);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  useEffect(() => { void ownerCoursesService.load().then((data) => { setCourses(data.courses); setSelectedCourse(data.selectedCourse); setLessons(data.lessons); }); }, []);
  const handleSelectCourse = async (course: Course) => { setSelectedCourse(course); setLessons(await ownerCoursesService.getLessons(course)); };
  const handleToggleLessonStatus = async (lesson: Lesson) => {
    const status = await ownerCoursesService.toggleLessonStatus(lesson);
    setLessons((current) => current.map((item) => item.id === lesson.id ? { ...item, status } : item));
  };
  const handleSetLessonStatus = async (lesson: Lesson, status: ContentStatus) => {
    await ownerCoursesService.setLessonStatus(lesson, status);
    setLessons((current) => current.map((item) => item.id === lesson.id ? { ...item, status } : item));
  };
  const handleCreateLesson = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedCourse) return;
    const created = await ownerCoursesService.createLesson({ courseId: selectedCourse.id, ...newLessonData,
      unitNumber: Number(newLessonData.unitNumber), durationMinutes: Number(newLessonData.durationMinutes),
      vocabList: [], grammarRules: [], listeningPhrases: [], quizQuestions: [] });
    setLessons((current) => [created, ...current]); setIsCreatingLesson(false);
    setNewLessonData({ ...initialForm, unitNumber: lessons.length + 1 });
  };
  const filteredLessons = useMemo(() => statusFilter === 'all' ? lessons : lessons.filter((lesson) => lesson.status === statusFilter), [lessons, statusFilter]);
  return { courses, lessons, selectedCourse, statusFilter, setStatusFilter, isCreatingLesson, setIsCreatingLesson,
    newLessonData, setNewLessonData, previewLesson, setPreviewLesson, filteredLessons,
    handleSelectCourse, handleToggleLessonStatus, handleSetLessonStatus, handleCreateLesson };
}
