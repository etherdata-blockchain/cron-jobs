FROM python:3.10

WORKDIR /app
COPY user_fetcher .
RUN pip3 install -r requirements.txt

CMD ["python3", "meili_fetcher.py"]