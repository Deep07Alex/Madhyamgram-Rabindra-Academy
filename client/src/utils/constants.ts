export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
    'Nursery': [
        'Bengali Language', 'English Literature', 'English Language', 'Hindi', 'Mathematics', 
        'General Knowledge', 'Computer Oral', 'Computer Practical', 'Physical Education', 
        'Work Education', 'Bengali Handwriting', 'English Handwriting', 'Mathematics Oral', 
        'Bengali Rhymes', 'English Rhymes'
    ],
    'KG-I': [
        'Bengali Language', 'English Literature', 'English Language', 'Hindi', 'Mathematics', 
        'General Knowledge', 'Computer Oral', 'Computer Practical', 'Physical Education', 
        'Work Education', 'Bengali Handwriting', 'English Handwriting', 'Mathematics Oral', 
        'Bengali Rhymes', 'English Rhymes'
    ],
    'KG-II A': [
        'Bengali Language', 'English Literature', 'English Language', 'Hindi', 'Mathematics', 
        'Science', 'General Knowledge', 'Computer Written', 'Computer Practical', 
        'Physical Education', 'Work Education', 'Bengali Handwriting', 'English Handwriting', 
        'Spoken English', 'Project'
    ],
    'KG-II B': [
        'Bengali Language', 'English Literature', 'English Language', 'Hindi', 'Mathematics', 
        'Science', 'General Knowledge', 'Computer Written', 'Computer Practical', 
        'Physical Education', 'Work Education', 'Bengali Handwriting', 'English Handwriting', 
        'Spoken English', 'Project'
    ],
    'STD-I': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 
        'Hindi', 'Mathematics', 'HGS', 'History', 'Geography', 'General Knowledge', 
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education', 
        'Spoken English', 'Project'
    ],
    'STD-II': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 
        'Hindi', 'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education', 
        'Spoken English', 'Project'
    ],
    'STD-III': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 
        'Hindi', 'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education', 
        'Spoken English', 'Project'
    ],
    'STD-IV': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 
        'Hindi', 'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education', 
        'Spoken English', 'Project'
    ]
};

export const SUBJECT_FULL_MARKS: Record<string, { unit12: number; unit3: number }> = {
    'Bengali Literature': { unit12: 50, unit3: 100 },
    'Bengali Language': { unit12: 50, unit3: 100 },
    'English Literature': { unit12: 50, unit3: 100 },
    'English Language': { unit12: 50, unit3: 100 },
    'Hindi': { unit12: 25, unit3: 50 },
    'Mathematics': { unit12: 50, unit3: 100 },
    'Science': { unit12: 25, unit3: 50 },
    'History': { unit12: 25, unit3: 50 },
    'Geography': { unit12: 25, unit3: 50 },
    'General Knowledge': { unit12: 25, unit3: 50 },
    'Computer Written': { unit12: 20, unit3: 40 },
    'Computer Practical': { unit12: 10, unit3: 20 },
    'Physical Education': { unit12: 25, unit3: 50 },
    'Work Education': { unit12: 25, unit3: 50 },
    'Spoken English': { unit12: 20, unit3: 40 },
    'Project': { unit12: 25, unit3: 50 },
    'Bengali Handwriting': { unit12: 15, unit3: 30 },
    'English Handwriting': { unit12: 15, unit3: 30 },
    'Mathematics Oral': { unit12: 15, unit3: 30 },
    'Bengali Rhymes': { unit12: 15, unit3: 30 },
    'English Rhymes': { unit12: 15, unit3: 30 },
    'HGS': { unit12: 25, unit3: 50 },
    'Computer Oral': { unit12: 15, unit3: 30 },
    'default': { unit12: 50, unit3: 100 }
};

export const getFullMarks = (subject: string, semester: string, className?: string): number => {
    let marks = SUBJECT_FULL_MARKS[subject] || SUBJECT_FULL_MARKS['default'];
    
    // Special Case: STD-IV Science is 50 instead of 25
    if (subject === 'Science' && className === 'STD-IV') {
        marks = { unit12: 50, unit3: 100 };
    }
    
    return (semester === 'Unit-III') ? marks.unit3 : marks.unit12;
};

export const MAIN_SUBJECTS = Array.from(new Set(Object.values(SUBJECTS_BY_CLASS).flat())).sort();

export const EXAMINATION_TERMS = ['Unit-I', 'Unit-II', 'Unit-III'];
export const ACADEMIC_YEARS = [2024, 2025, 2026];
