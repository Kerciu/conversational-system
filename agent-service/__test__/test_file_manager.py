import base64
import os

import pytest
from file_manager import extract_text_from_files, save_files_to_disk


class TestExtractTextFromFiles:
    def test_returns_empty_string_for_empty_list(self):
        result = extract_text_from_files([])
        assert result == ""

    def test_extracts_text_from_txt_file(self):
        content = "Hello world"
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        files_data = [{"name": "test.txt", "content": encoded}]

        result = extract_text_from_files(files_data)

        assert "Hello world" in result
        assert "test.txt" in result

    def test_extracts_text_from_py_file(self):
        content = "def foo(): pass"
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        files_data = [{"name": "script.py", "content": encoded}]

        result = extract_text_from_files(files_data)

        assert "def foo(): pass" in result

    def test_extracts_text_from_md_file(self):
        content = "# Title\nSome text"
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        files_data = [{"name": "readme.md", "content": encoded}]

        result = extract_text_from_files(files_data)

        assert "# Title" in result

    def test_extracts_text_from_json_file(self):
        content = '{"key": "value"}'
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        files_data = [{"name": "data.json", "content": encoded}]

        result = extract_text_from_files(files_data)

        assert '"key": "value"' in result

    def test_unsupported_file_extension_returns_placeholder(self):
        content = b"\x89PNG\r\n"
        encoded = base64.b64encode(content).decode("utf-8")
        files_data = [{"name": "image.png", "content": encoded}]

        result = extract_text_from_files(files_data)

        assert "nieobsługiwany" in result or "image.png" in result

    def test_handles_multiple_files(self):
        content1 = base64.b64encode(b"file one content").decode("utf-8")
        content2 = base64.b64encode(b"file two content").decode("utf-8")
        files_data = [
            {"name": "a.txt", "content": content1},
            {"name": "b.txt", "content": content2},
        ]

        result = extract_text_from_files(files_data)

        assert "file one content" in result
        assert "file two content" in result
        assert "a.txt" in result
        assert "b.txt" in result

    def test_handles_invalid_base64_gracefully(self):
        files_data = [{"name": "bad.txt", "content": "not_valid_base64!!!"}]
        result = extract_text_from_files(files_data)
        assert "bad.txt" in result

    def test_uses_unknown_file_name_when_name_missing(self):
        content = base64.b64encode(b"data").decode("utf-8")
        files_data = [{"content": content}]
        result = extract_text_from_files(files_data)
        assert "PLIK" in result


class TestSaveFilesToDisk:
    def test_saves_single_file_and_returns_path(self, tmp_path):
        content = b"hello binary"
        encoded = base64.b64encode(content).decode("utf-8")
        files_data = [{"name": "output.txt", "content_base64": encoded}]

        paths = save_files_to_disk(files_data, "job-001")

        assert len(paths) == 1
        assert paths[0].endswith("output.txt")
        assert os.path.exists(paths[0])
        with open(paths[0], "rb") as f:
            assert f.read() == content

    def test_saves_multiple_files(self):
        files_data = [
            {
                "name": "f1.txt",
                "content_base64": base64.b64encode(b"one").decode("utf-8"),
            },
            {
                "name": "f2.txt",
                "content_base64": base64.b64encode(b"two").decode("utf-8"),
            },
        ]

        paths = save_files_to_disk(files_data, "job-002")

        assert len(paths) == 2
        filenames = [os.path.basename(p) for p in paths]
        assert "f1.txt" in filenames
        assert "f2.txt" in filenames

    def test_creates_directory_for_job_id(self):
        encoded = base64.b64encode(b"x").decode("utf-8")
        files_data = [{"name": "file.bin", "content_base64": encoded}]

        paths = save_files_to_disk(files_data, "unique-job-xyz")

        assert "unique-job-xyz" in paths[0]
