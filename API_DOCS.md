# API Documentation

## Base URL

    http://localhost:3000/

---

## Blog APIs

### Create Blog
- **Endpoint:** `POST /api/blogs`
- **Description:** Create a new blog post. Supports file upload for `featured_image`.
- **Request Body (form-data):**
    - `title` (string, required)
    - `short_desc` (string, required)
    - `content` (string, required)
    - `status` (string, required)
    - `scheduled_time` (string, optional)
    - `category` (string, required)
    - `tags` (string, comma-separated, optional)
    - `seo_title` (string, optional)
    - `seo_description` (string, optional)
    - `seo_keyword` (string, optional)
    - `featured_image` (file, optional)
- **Response:**
    - `201 Created` with the created blog object

### Get Blog by ID
- **Endpoint:** `GET /api/blogs/:id`
- **Description:** Fetch a blog post by its ID.
- **Response:**
    - `200 OK` with the blog object
    - `404 Not Found` if blog does not exist

---

## User APIs

### Create New User
- **Endpoint:** `POST /newUser`
- **Description:** Register a new user. Password is hashed before storing.
- **Request Body (JSON):**
    - `email` (string, required)
    - `password` (string, required)
    - `phone` (string, required)
    - `first_name` (string, required)
    - `last_name` (string, required)
    - `role` (string, required)
    - `gender` (string, required)
- **Response:**
    - `201 Created` with the created user object

### Get User by Email
- **Endpoint:** `GET /getUser`
- **Description:** Fetch a user by email.
- **Request Body (JSON):**
    - `email` (string, required)
- **Response:**
    - `201 Created` with the user object
    - `404 Not Found` if user does not exist

### Validate User Password
- **Endpoint:** `POST /validatePassword`
- **Description:** Validate a user's password by email.
- **Request Body (JSON):**
    - `email` (string, required)
    - `password` (string, required)
- **Response:**
    - `200 OK` if password matches
    - `403 Forbidden` if password does not match
    - `404 Not Found` if user does not exist

---

## Notes
- All responses are in JSON format.
- Uploaded images are accessible at `/uploads/<filename>`.
- Ensure to set appropriate headers for JSON or form-data requests as required.
