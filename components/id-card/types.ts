export interface IDCardData {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  establishedYear: string;
  studentName: string;
  studentPhoto: string;
  grade: string;
  stream: string;
  idNumber: string;
  academicYear: string;
  bloodGroup: string;
  expiryDate: string;
}

export interface IDCardSettings {
  themeColor: string;
  showBack: boolean;
  cardSize: "CR80" | "A6" | "Custom";
  fontFamily: string;
}
