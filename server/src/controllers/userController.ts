import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Get all students
export const getStudents = async (req: Request, res: Response) => {
    try {
        const students = await prisma.student.findMany({
            include: { class: true }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// Get all teachers
export const getTeachers = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.teacher.findMany({
            include: { classes: true }
        });
        res.json(teachers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};

// Get all classes
export const getClasses = async (req: Request, res: Response) => {
    try {
        const classes = await prisma.class.findMany({
            include: { _count: { select: { students: true } } }
        });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes' });
    }
};

// Create a class
export const createClass = async (req: Request, res: Response) => {
    const { name, grade } = req.body;
    try {
        const newClass = await prisma.class.create({
            data: { name, grade: parseInt(grade as string) }
        });
        res.status(201).json(newClass);
    } catch (error) {
        res.status(500).json({ message: 'Error creating class' });
    }
};

// Delete a student
export const deleteStudent = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.student.delete({ where: { id } });
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student' });
    }
};

// Delete a teacher
export const deleteTeacher = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.teacher.delete({ where: { id } });
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting teacher' });
    }
};

// Delete a class
export const deleteClass = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.class.delete({ where: { id } });
        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class' });
    }
};
