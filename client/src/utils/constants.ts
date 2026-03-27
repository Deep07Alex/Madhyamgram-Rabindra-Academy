export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
    'Nursery': [
        'Bengali Literature', 'English Literature', 'Mathematics', 
        'General Knowledge', 'Physical Education', 
        'Work Education', 'Bengali Handwriting', 'English Handwriting', 
        'Mathematics Oral', 'Bengali Rhymes', 'English Rhymes'
    ],
    'KG-I': [
        'Bengali Literature', 'English Literature', 'Mathematics', 
        'General Knowledge', 'Computer Oral', 'Computer Practical', 'Physical Education', 
        'Work Education', 'Bengali Handwriting', 'English Handwriting', 'Mathematics Oral', 
        'Bengali Rhymes', 'English Rhymes'
    ],
    'KG-II A': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 
        'General Knowledge', 'Computer Written', 'Computer Practical', 
        'Physical Education', 'Work Education', 'Bengali Handwriting', 'English Handwriting', 
        'Spoken English', 'Project'
    ],
    'KG-II B': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 
        'General Knowledge', 'Computer Written', 'Computer Practical', 
        'Physical Education', 'Work Education', 'Bengali Handwriting', 'English Handwriting', 
        'Spoken English', 'Project'
    ],
    'STD-I': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 
        'HGS', 'General Knowledge', 'Computer Written', 'Computer Practical', 
        'Physical Education', 'Work Education', 'Spoken English', 'Project'
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

export const getFullMarks = (subject: string, semester: string, className?: string): number => {
    let baseMarks = 50; // default

    if (subject === 'Bengali Literature') {
        baseMarks = 50;
    } else if (subject === 'Bengali Language') {
        baseMarks = 50;
    } else if (subject === 'English Literature') {
        baseMarks = 50;
    } else if (subject === 'English Language') {
        baseMarks = 50;
    } else if (subject === 'Hindi') {
        baseMarks = 25;
    } else if (subject === 'Mathematics') {
        baseMarks = 50;
    } else if (subject === 'Science') {
        if (className === 'STD-IV') baseMarks = 50;
        else baseMarks = 25;
    } else if (subject === 'History') {
        if (className === 'STD-IV') baseMarks = 50;
        else baseMarks = 25;
    } else if (subject === 'Geography') {
        if (className === 'STD-IV') baseMarks = 50;
        else baseMarks = 25;
    } else if (subject === 'General Knowledge') {
        if (className === 'STD-IV') baseMarks = 50;
        else baseMarks = 25;
    } else if (subject === 'Computer Written') {
        baseMarks = 20;
    } else if (subject === 'Computer Practical') {
        baseMarks = 10;
    } else if (subject === 'Physical Education') {
        baseMarks = 25;
    } else if (subject === 'Work Education') {
        baseMarks = 25;
    } else if (subject === 'Spoken English') {
        baseMarks = 20;
    } else if (subject === 'Project') {
        if (className === 'KG-II A' || className === 'KG-II B') {
            baseMarks = 20;
        } else {
            baseMarks = 25;
        }
    } else if (subject === 'Bengali Handwriting' || subject === 'Bengali Handwraiting') {
        if (className === 'Nursery') baseMarks = 15;
        else if (className === 'KG-I') baseMarks = 10;
        else if (className === 'KG-II A' || className === 'KG-II B') baseMarks = 15;
        else baseMarks = 15;
    } else if (subject === 'English Handwriting') {
        if (className === 'Nursery') baseMarks = 15;
        else if (className === 'KG-I') baseMarks = 10;
        else if (className === 'KG-II A' || className === 'KG-II B') baseMarks = 15;
        else baseMarks = 15;
    } else if (subject === 'Mathematics Oral') {
        if (className === 'Nursery') baseMarks = 15;
        else if (className === 'KG-I') baseMarks = 10;
        else baseMarks = 15;
    } else if (subject === 'Bengali Rhymes') {
        if (className === 'Nursery') baseMarks = 15;
        else if (className === 'KG-I') baseMarks = 10;
        else baseMarks = 15;
    } else if (subject === 'English Rhymes') {
        if (className === 'Nursery') baseMarks = 15;
        else if (className === 'KG-I') baseMarks = 10;
        else baseMarks = 15;
    } else if (subject === 'HGS') {
        baseMarks = 25;
    } else if (subject === 'Computer Oral') {
        baseMarks = 15;
    }

    const marks = { unit12: baseMarks, unit3: baseMarks * 2 };
    return (semester === 'Unit-III') ? marks.unit3 : marks.unit12;
};

export const MAIN_SUBJECTS = Array.from(new Set(Object.values(SUBJECTS_BY_CLASS).flat())).sort();

export const EXAMINATION_TERMS = ['Unit-I', 'Unit-II', 'Unit-III'];
export const ACADEMIC_YEARS = Array.from({ length: 12 }, (_, i) => 2024 + i);
