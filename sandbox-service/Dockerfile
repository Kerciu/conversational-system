FROM python:3.12-slim

WORKDIR /sandbox

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=app

EXPOSE 2137

CMD ["flask", "run"]
