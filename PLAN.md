# Project description:

# **Surf-IsCool - Surf & Skate School Scheduling Platform**

The Surf-IsCool is a cross-platform mobile application (Android and iOS) designed to manage surf and skate lectures between instructors and students.

## General User Journeys (applies for Student, Instructor and Admin)

- As an User, I'd like to be able to create an account using my Google account
- As an User, I'd like to be able to create an account using my Facebook account
- As an User, I'd like to be able to create an account using my Apple account
- As an User, I'd like to be able to update my profile (profile image, name, phone)
- As an User, I'd like to be able to delete my account
- As an User, I'd like to be able to reactivate my deleted account
- As an User, I'd like to set my system-preferences (app-theme, notifications, language)
- As an User, I'd like to list all my notifications
- As an User, I'd like to mark a notification that I received as read
- As an User, I'd like to see all then Users registered
- As an User, I’d like to be able to see the list of classes of the current week per day
- As an User, I’d like to be able to see the list of classes of past weeks per day

## Admin

Admin instructors have full control over schedules, users, and system configurations.

**Permissions**

- Create, edit, and delete weekly schedules for Surf and Skate classes.
- Manage users and instructors.
- Send global notifications
- Manage cancellation rules

**Define for each lecture:**

- Discipline: Surf or Skate.
- Skill level: Beginner, Advanced, or Expert (informational label only).
- Date and time (each lecture is exactly one hour long).
- Location
- Assigned instructor(s) (at least one required).
- Maximum capacity

**Approve or deny:**

- New student registrations into the platform.
- Students request to enroll into lectures.

**User journeys**

- As an Admin, I'd like to be able to approve or deny a user to join the platform
- As an Admin, I'd like to be able to remove a user (student or instructor) from the platform
- As an Admin, I'd like to be able to promote a Student to Instructor
- As an Admin, I'd like to be able to promote an Instructor to a Student
- As an Admin, I'd like to be able to create the schedule of classes of a specific day
- As an Admin, I'd like to be able to assign Instructors to a class
- As an Admin, I'd like to be able to define the max capacity of students that a class will have
- As an Admin, I'd like to be able to approve or deny students enrollments to the classes
- As an Admin, I'd like to be able to edit the details of a class and notify the enrolled students and assigned instructors about the change
- As an Admin, I'd like to be able to cancel a class and notify the enrolled students and assigned instructors about the cancellation
- As an Admin, I'd like to be able to send a notification to all users in the system
- As an Admin, I'd like to be able to define global cancellation-class rules to be used when a student wants to cancel their enrollment in any class
- As an Admin, I'd like to be able to have access to a Dashboard with some metrics TBD
- As an Admin, I’d like to be able to upload pictures on any already finished classes

## Instructor

Instructors can view and monitor their assigned lectures but cannot modify schedules or system rules.

**Permissions:**

- View all lectures assigned to them (Surf or Skate).
- Access a notifications listing:
- Student join requests (pending admin approval).
- Student cancellations
- Lecture cancellations.
- Student feedback and ratings after lectures.

**Instructors cannot:**

- Approve or reject students or join requests.
- Cancel classes.
- Modify the cancellation rule.

**User journey**

- As an Instructor, I’d like to be able to see the details of the classes in which I’ll be instructor
- As an Instructor, I'd like to be able to see all of the classes that I was instructor
- As an Instructor, I'd like to receive a notification 30 minutes before the class that I'll be instructor to start
- As an Instructor, I’d like to be notified when I'm assigned to a class as instructor
- As an Instructor, I’d like to be notified when a class that I’ll be instructor is updated
- As an Instructor, I’d like to be notified when a class that I’ll be instructor is cancelled
- As an Instructor, I’d like to be able to upload pictures on any already finished classes

## Student

**Permissions and Workflow:**

- Register using Social Login (E-mail + password, Google or Facebook): Wait for admin approval before accessing the app.
- Once approved: View available Surf and Skate lectures for current and past weeks.
- Request to join lectures that are not full.
- Optionally mark their request as experimental, indicating they are total beginners.
- Cancel enrollment (only if allowed by the global cancellation rule)
- Rate past lectures after completion.

**View lecture details:**

- Discipline (Surf or Skate).
- Skill level (Beginner / Advanced / Expert).
- Instructor(s).
- Date, time, and location.
- Maximum capacity.
- List of confirmed students.

**Students cannot:**

- Join full lectures.
- Join or cancel lectures outside rule constraints.
- View lectures or schedules before admins approve their account into the platform.

**User journeys**

- As a Student, I’d like to join classes
- As a Student, I’d like to take experimental classes
- As a Student, I’d like to cancel my already approved enrolments in classes
- As a Student, I’d like to be able to filter the list of classes that I’ve requested by enrollment status (denied, approved, pending)
- As a Student, I’d like to be able to upload pictures of the classes that I’ve joined after they’re finished
- As a Student, I’d like to be able to be notified about updates on the classes that I’m enrolled
- As a Student, I'd like to receive a notification 30 minutes before a class that I’ve enrolled to start
- As a Student, I’d like to receive a notification to rate and leave a comment in a class that I’ve joined 30 minutes after the class has ended.
