export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
    'Nursery': [
        'Bengali Literature', 'English Literature', 'Mathematics', 'General Knowledge',
        'Physical Education', 'Work Education', 'Bengali Handwriting', 'English Handwriting',
        'Mathematics Oral', 'Bengali Rhymes', 'English Rhymes'
    ],
    'KG-I': [
        'Bengali Literature', 'English Literature', 'Mathematics', 'General Knowledge',
        'Computer Oral', 'Computer Practical', 'Physical Education', 'Work Education',
        'Bengali Handwriting', 'English Handwriting', 'Mathematics Oral', 'Bengali Rhymes',
        'English Rhymes'
    ],
    'KG-II A': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 'General Knowledge',
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education',
        'Bengali Handwriting', 'English Handwriting', 'Spoken English', 'Project'
    ],
    'KG-II B': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 'General Knowledge',
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education',
        'Bengali Handwriting', 'English Handwriting', 'Spoken English', 'Project'
    ],
    'STD-I': [
        'Bengali Literature', 'English Literature', 'Hindi', 'Mathematics', 'HGS', 'General Knowledge',
        'Computer Written', 'Computer Practical', 'Physical Education', 'Work Education',
        'Spoken English', 'Project'
    ],
    'STD-II': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 'Hindi',
        'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 'Computer Written',
        'Computer Practical', 'Physical Education', 'Work Education', 'Spoken English', 'Project'
    ],
    'STD-III': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 'Hindi',
        'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 'Computer Written',
        'Computer Practical', 'Physical Education', 'Work Education', 'Spoken English', 'Project'
    ],
    'STD-IV': [
        'Bengali Literature', 'Bengali Language', 'English Literature', 'English Language', 'Hindi',
        'Mathematics', 'Science', 'History', 'Geography', 'General Knowledge', 'Computer Written',
        'Computer Practical', 'Physical Education', 'Work Education', 'Spoken English', 'Project'
    ]
};

/**
 * STRICT RULEBOOK — exact subject name matching, no doubling for any unit.
 * Every unit (I, II, III) carries the same weight per the school's specification.
 */
export const getFullMarks = (subject: string, className: string = ''): number => {
    switch (subject.trim()) {
        case 'Bengali Literature':
        case 'Bengali Language':
        case 'English Literature':
        case 'English Language':
        case 'Mathematics':
            return 50;
        case 'Science':
        case 'History':
        case 'Geography':
        case 'General Knowledge':
            return className === 'STD-IV' ? 50 : 25;
        case 'Hindi':
        case 'HGS':
        case 'Physical Education':
        case 'Work Education':
            return 25;
        case 'Project':
            return (className === 'KG-II A' || className === 'KG-II B') ? 20 : 25;
        case 'Computer Written':
            return 20;
        case 'Computer Practical':
            return 10;
        case 'Computer Oral':
            return 15;
        case 'Spoken English':
            return 20;
        case 'Bengali Handwriting':
        case 'Bengali Handwraiting':
        case 'English Handwriting':
            return className === 'KG-I' ? 10 : 15;
        case 'Mathematics Oral':
        case 'Bengali Rhymes':
        case 'English Rhymes':
            return className === 'KG-I' ? 10 : 15;
        default:
            return 50;
    }
};

export const MAIN_SUBJECTS = Array.from(new Set(Object.values(SUBJECTS_BY_CLASS).flat())).sort();
export const EXAMINATION_TERMS = ['Unit-I', 'Unit-II', 'Unit-III'];
export const ACADEMIC_YEARS = Array.from({ length: 12 }, (_, i) => 2024 + i);
