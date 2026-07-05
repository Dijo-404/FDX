Model weights are stored as a verified zip split into parts so each part stays
below GitHub's single-file size limits.

To restore the local `model-weights/` directory, run from the repository root:

```sh
cat model-weights-archive/model-weights.zip.part-* > model-weights-full.zip
unzip model-weights-full.zip
rm model-weights-full.zip
```
