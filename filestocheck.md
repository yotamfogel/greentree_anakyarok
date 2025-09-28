Files that need to be checked during upload:
src/contexts/SagachDataContext.tsx - Contains the migration function
src/components/SagachimStatus.tsx - Uses sagach.arena.join()
src/components/SagachAnalyticsModal.tsx - Uses sagach.arena.join()
src/components/SagachimArchive.tsx - Uses item.arena.join()
The error occurs because when you upload the project to an offline computer, if there's existing data in localStorage that was created before the arena field was properly defined, the migration doesn't initialize it as an array.