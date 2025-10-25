FROM python:3.12-slim

WORKDIR /agent-service

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app

EXPOSE 3721

CMD ["flask", "run"]
