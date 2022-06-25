FROM python:3.10-alpine

WORKDIR /app
COPY block_fetcher .
RUN pip3 install -r requirements.txt

CMD ["python3", "block_fetcher.py"]